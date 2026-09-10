package local.memoir.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.util.Base64;
import android.webkit.WebView;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.getcapacitor.PluginHandle;
import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class AndroidRuntimeInferenceSmokeTest {
    @Test
    public void runsPublicCapacitorBridgeWithVerifiedModel() throws Exception {
        Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
        Context targetContext = instrumentation.getTargetContext();
        assertEquals("local.memoir.mobile", targetContext.getPackageName());

        Intent intent = new Intent(targetContext, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        MainActivity activity = (MainActivity) instrumentation.startActivitySync(intent);
        instrumentation.waitForIdleSync();

        try {
            assertNotNull(activity.getBridge());
            PluginHandle handle = activity.getBridge().getPlugin("MemoirRuntime");
            assertNotNull(handle);
            assertTrue(handle.getInstance() instanceof MemoirRuntimePlugin);
            Class<MemoirRuntimePlugin> pluginClass = MemoirRuntimePlugin.class;
            assertTrue(readBooleanField(pluginClass, "NATIVE_LIBRARY_LOADED"));

            String expectedSha256 = readStringField(pluginClass, "MODEL_SHA256");
            long expectedSize = readLongField(pluginClass, "MODEL_SIZE_BYTES");
            File modelFile = new File(
                new File(targetContext.getFilesDir(), "memoir-models"),
                "Qwen_Qwen3.5-0.8B-Q5_K_M.gguf"
            );
            deleteRecursively(modelFile.getParentFile());

            WebView webView = activity.getBridge().getWebView();
            assertNotNull(webView);
            waitForRuntimeBridge(instrumentation, webView);
            JSONObject result = runPublicBridgeSmoke(
                instrumentation,
                webView,
                buildMemoirRequest(),
                !BuildConfig.MEMOIR_EMULATOR_SMOKE
            );
            assertTrue(result.optString("error"), result.getBoolean("ok"));

            JSONObject health = result.getJSONObject("health");
            assertEquals("android", health.getString("platform"));
            assertEquals("embedded-llama", health.getString("runtime"));
            assertEquals("llama.cpp-android-jni-ready", health.getString("nativeStatus"));
            assertEquals("ready", health.getString("phase"));
            assertTrue(health.getBoolean("available"));
            assertTrue(health.getBoolean("modelInstalled"));

            assertTrue(modelFile.isFile());
            assertEquals(expectedSize, modelFile.length());
            assertEquals(expectedSha256, sha256(modelFile));

            File verificationMarker = new File(modelFile.getParentFile(), modelFile.getName() + ".verified");
            assertTrue(verificationMarker.isFile());
            assertEquals(
                expectedSha256,
                new String(readAllBytes(verificationMarker), StandardCharsets.US_ASCII)
            );

            JSONObject memoir = result.getJSONObject("memoir");
            assertFalse(memoir.getString("title").trim().isEmpty());
            JSONArray sections = memoir.getJSONArray("sections");
            assertEquals(3, sections.length());
            for (int index = 0; index < sections.length(); index += 1) {
                assertEquals("asset-smoke-" + (index + 1), sections.getJSONObject(index).getString("assetId"));
                assertFalse(sections.getJSONObject(index).getString("caption").trim().isEmpty());
                assertFalse(sections.getJSONObject(index).getString("body").trim().isEmpty());
            }
            JSONObject cancellation = result.getJSONObject("cancellation");
            assertTrue(cancellation.getBoolean("cancelled"));
            if (!BuildConfig.MEMOIR_EMULATOR_SMOKE) {
                assertFalse(result.getJSONObject("rewrite").getString("text").trim().isEmpty());
                assertEquals("android-runtime-active-cancel", cancellation.getString("jobId"));
                JSONObject cancellationOutcome = result.getJSONObject("cancellationOutcome");
                assertFalse(cancellationOutcome.getBoolean("resolved"));
                assertTrue(cancellationOutcome.getString("error").contains("native-ai-generation-cancelled"));
            } else {
                assertEquals("android-runtime-cancel-smoke", cancellation.getString("jobId"));
            }
        } finally {
            instrumentation.runOnMainSync(activity::finish);
            instrumentation.waitForIdleSync();
        }
    }

    private static JSONObject runPublicBridgeSmoke(
        Instrumentation instrumentation,
        WebView webView,
        JSObject request,
        boolean includeRewrite
    ) throws Exception {
        String dataUrl = buildFixturePhotoDataUrl();
        String cancellationScript = includeRewrite
            ? String.join("\n",
                "    const cancellationOutcomePromise = runtime.rewrite({",
                "      jobId: 'android-runtime-active-cancel',",
                "      tone: 'diary',",
                "      text: 'Keep this sentence grounded while cancellation is tested.'",
                "    }).then(",
                "      () => ({ resolved: true, error: '' }),",
                "      error => ({ resolved: false, error: error && error.message ? error.message : String(error) })",
                "    );",
                "    await new Promise(resolve => setTimeout(resolve, 750));",
                "    const cancellation = await runtime.cancelGeneration({ jobId: 'android-runtime-active-cancel' });",
                "    const cancellationOutcome = await cancellationOutcomePromise;"
            )
            : String.join("\n",
                "    const cancellation = await runtime.cancelGeneration({ jobId: 'android-runtime-cancel-smoke' });",
                "    const cancellationOutcome = { resolved: false, error: 'emulator-idle-contract-only' };"
            );
        String script = String.join("\n",
            "window.__memoirNativeSmoke = '';",
            "(async () => {",
            "  try {",
            "    const runtime = window.Capacitor.Plugins.MemoirRuntime;",
            "    const health = await runtime.prepare();",
            "    const dataUrl = " + JSONObject.quote(dataUrl) + ";",
            "    for (let index = 1; index <= 3; index += 1) {",
            "      await runtime.stageAsset({ assetId: `asset-smoke-${index}`, dataUrl });",
            "    }",
            "    const memoir = await runtime.generateMemoir(" + request.toString() + ");",
            "    const rewrite = " + (includeRewrite
                ? "await runtime.rewrite({ jobId: 'android-runtime-rewrite-smoke', tone: 'editorial', text: memoir.sections[0].body })"
                : "{ text: 'skipped-on-emulator' }") + ";",
            cancellationScript,
            "    window.__memoirNativeSmoke = JSON.stringify({ ok: true, health, memoir, rewrite, cancellation, cancellationOutcome });",
            "  } catch (error) {",
            "    const message = error && error.message ? error.message : String(error);",
            "    window.__memoirNativeSmoke = JSON.stringify({ ok: false, error: message });",
            "  }",
            "})();",
            "'started';"
        );
        assertEquals("started", evaluateString(instrumentation, webView, script));

        long deadline = System.nanoTime() + TimeUnit.MINUTES.toNanos(7);
        while (System.nanoTime() < deadline) {
            String value = evaluateString(
                instrumentation,
                webView,
                "String(window.__memoirNativeSmoke || '')"
            );
            if (!value.isEmpty()) {
                return new JSONObject(value);
            }
            Thread.sleep(1_000);
        }
        throw new AssertionError("Public MemoirRuntime bridge did not complete within seven minutes.");
    }

    private static void waitForRuntimeBridge(Instrumentation instrumentation, WebView webView) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(30);
        while (System.nanoTime() < deadline) {
            String ready = evaluateString(
                instrumentation,
                webView,
                "String(Boolean(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MemoirRuntime))"
            );
            if ("true".equals(ready)) {
                return;
            }
            Thread.sleep(250);
        }
        throw new AssertionError("MemoirRuntime was not registered in the Capacitor WebView.");
    }

    private static String evaluateString(
        Instrumentation instrumentation,
        WebView webView,
        String script
    ) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        instrumentation.runOnMainSync(() -> webView.evaluateJavascript(script, value -> {
            result.set(value);
            latch.countDown();
        }));
        if (!latch.await(10, TimeUnit.SECONDS)) {
            throw new AssertionError("WebView JavaScript evaluation timed out.");
        }
        String literal = result.get();
        if (literal == null || "null".equals(literal)) {
            return "";
        }
        return new JSONArray("[" + literal + "]").getString(0);
    }

    private static String buildFixturePhotoDataUrl() {
        Bitmap bitmap = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        canvas.drawColor(Color.rgb(232, 214, 206));
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.rgb(63, 83, 69));
        canvas.drawCircle(48, 38, 23, paint);
        paint.setColor(Color.rgb(244, 238, 230));
        canvas.drawRect(20, 67, 76, 78, paint);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output));
        bitmap.recycle();
        return "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
    }

    private static JSObject buildMemoirRequest() throws Exception {
        JSObject request = new JSObject();
        request.put("jobId", "android-runtime-smoke");
        request.put("tone", "diary");
        request.put("notes", "Title this memoir Android smoke day. Friends spent a calm afternoon together.");
        request.put("musicCue", "quiet piano");
        JSONArray assets = new JSONArray();
        for (int index = 1; index <= 3; index += 1) {
            JSONObject asset = new JSONObject();
            asset.put("id", "asset-smoke-" + index);
            assets.put(asset);
        }
        request.put("assets", assets);
        return request;
    }

    private static boolean readBooleanField(Class<?> type, String name) throws Exception {
        Field field = type.getDeclaredField(name);
        field.setAccessible(true);
        return field.getBoolean(null);
    }

    private static String readStringField(Class<?> type, String name) throws Exception {
        Field field = type.getDeclaredField(name);
        field.setAccessible(true);
        return (String) field.get(null);
    }

    private static long readLongField(Class<?> type, String name) throws Exception {
        Field field = type.getDeclaredField(name);
        field.setAccessible(true);
        return field.getLong(null);
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) {
            return;
        }
        File[] children = file.listFiles();
        if (children != null) {
            for (File child : children) {
                deleteRecursively(child);
            }
        }
        assertTrue("Could not delete stale smoke-test file: " + file, file.delete());
    }

    private static byte[] readAllBytes(File file) throws Exception {
        try (FileInputStream input = new FileInputStream(file);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8_192];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        }
    }

    private static String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[1024 * 1024];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                digest.update(buffer, 0, read);
            }
        }

        StringBuilder output = new StringBuilder(64);
        for (byte value : digest.digest()) {
            output.append(String.format(Locale.US, "%02X", value));
        }
        return output.toString();
    }
}
