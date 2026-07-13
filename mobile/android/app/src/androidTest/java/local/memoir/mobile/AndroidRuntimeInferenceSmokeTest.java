package local.memoir.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.getcapacitor.PluginHandle;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

@RunWith(AndroidJUnit4.class)
public class AndroidRuntimeInferenceSmokeTest {
    @Test
    public void stagesVerifiedModelAndRunsNativeInference() throws Exception {
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
            MemoirRuntimePlugin plugin = (MemoirRuntimePlugin) handle.getInstance();

            Class<MemoirRuntimePlugin> pluginClass = MemoirRuntimePlugin.class;
            assertTrue(readBooleanField(pluginClass, "NATIVE_LIBRARY_LOADED"));

            String modelAssetPath = readStringField(pluginClass, "MODEL_ASSET_PATH");
            String expectedSha256 = readStringField(pluginClass, "MODEL_SHA256");
            long expectedSize = readLongField(pluginClass, "MODEL_SIZE_BYTES");

            Method modelFileMethod = pluginClass.getDeclaredMethod("modelFile");
            modelFileMethod.setAccessible(true);
            File modelFile = (File) modelFileMethod.invoke(plugin);
            File expectedModelFile = new File(
                new File(targetContext.getFilesDir(), "memoir-models"),
                "Qwen_Qwen3.5-0.8B-Q5_K_M.gguf"
            );
            assertEquals(expectedModelFile.getCanonicalPath(), modelFile.getCanonicalPath());

            deleteRecursively(modelFile.getParentFile());

            Method stageVerifiedAsset = pluginClass.getDeclaredMethod(
                "stageVerifiedAsset",
                Context.class,
                String.class,
                File.class,
                String.class,
                long.class
            );
            stageVerifiedAsset.setAccessible(true);
            stageVerifiedAsset.invoke(
                plugin,
                plugin.getContext(),
                modelAssetPath,
                modelFile,
                expectedSha256,
                expectedSize
            );

            assertTrue(modelFile.isFile());
            assertEquals(expectedSize, modelFile.length());
            assertEquals(expectedSha256, sha256(modelFile));

            File verificationMarker = new File(modelFile.getParentFile(), modelFile.getName() + ".verified");
            assertTrue(verificationMarker.isFile());
            assertEquals(
                expectedSha256,
                new String(readAllBytes(verificationMarker), StandardCharsets.US_ASCII)
            );

            Method nativeRuntimeStatus = pluginClass.getDeclaredMethod("nativeRuntimeStatus");
            nativeRuntimeStatus.setAccessible(true);
            assertEquals("llama.cpp-android-jni-ready", nativeRuntimeStatus.invoke(null));

            Method nativeGenerate = pluginClass.getDeclaredMethod(
                "nativeGenerate",
                String.class,
                String.class,
                String.class,
                int.class
            );
            nativeGenerate.setAccessible(true);
            String generated = (String) nativeGenerate.invoke(
                null,
                modelFile.getAbsolutePath(),
                "Return strict JSON only: {\"status\":\"ready\"}",
                "android-runtime-smoke",
                32
            );
            assertNotNull(generated);
            assertFalse(generated.trim().isEmpty());
        } finally {
            instrumentation.runOnMainSync(activity::finish);
            instrumentation.waitForIdleSync();
        }
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
