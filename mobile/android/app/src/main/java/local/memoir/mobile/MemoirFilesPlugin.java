package local.memoir.mobile;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "MemoirFiles")
public class MemoirFilesPlugin extends Plugin {
    private static final int MAX_SHARED_FILES = 10;
    private static final int MAX_BASE64_CHARS = 64 * 1024 * 1024;
    private static final int MAX_FILE_BYTES = 48 * 1024 * 1024;
    private static final int MAX_SHARED_FILE_BYTES = 12 * 1024 * 1024;
    private static final int MAX_SHARED_TOTAL_BYTES = 48 * 1024 * 1024;
    private static final Set<String> MIME_TYPES = new HashSet<>(Arrays.asList(
        "text/html",
        "application/json",
        "application/zip",
        "application/vnd.memoir+zip"
    ));

    @PluginMethod
    public void shareFile(PluginCall call) {
        String name = call.getString("name", "").trim();
        String mimeType = call.getString("mimeType", "").trim().toLowerCase(Locale.ROOT);
        String base64Data = call.getString("base64Data", "");
        if (!name.matches("[A-Za-z0-9][A-Za-z0-9._ -]{0,119}") || name.contains("..")) {
            call.reject("native-export-invalid-name");
            return;
        }
        if (!MIME_TYPES.contains(mimeType)) {
            call.reject("native-export-invalid-mime");
            return;
        }
        if (base64Data.isEmpty() || base64Data.length() > MAX_BASE64_CHARS) {
            call.reject("native-export-file-too-large");
            return;
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(base64Data, Base64.NO_WRAP);
        } catch (IllegalArgumentException error) {
            call.reject("native-export-invalid-data");
            return;
        }
        if (bytes.length == 0 || bytes.length > MAX_FILE_BYTES) {
            Arrays.fill(bytes, (byte) 0);
            call.reject("native-export-file-too-large");
            return;
        }

        try {
            File directory = new File(getContext().getCacheDir(), "exports");
            clearDirectory(directory);
            if (!directory.exists() && !directory.mkdirs()) {
                throw new IllegalStateException("native-export-directory-unavailable");
            }
            File target = new File(directory, name);
            if (!target.getCanonicalFile().getParentFile().equals(directory.getCanonicalFile())) {
                throw new IllegalArgumentException("native-export-invalid-name");
            }
            try (FileOutputStream output = new FileOutputStream(target)) {
                output.write(bytes);
                output.flush();
                output.getFD().sync();
            } finally {
                Arrays.fill(bytes, (byte) 0);
            }

            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                target
            );
            Intent intent = new Intent(Intent.ACTION_SEND)
                .setType(mimeType)
                .putExtra(Intent.EXTRA_STREAM, uri)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().startActivity(Intent.createChooser(intent, "Share memoir"));
                    JSObject result = new JSObject();
                    result.put("shared", true);
                    result.put("name", name);
                    call.resolve(result);
                } catch (Exception error) {
                    call.reject("native-export-share-unavailable");
                }
            });
        } catch (Exception error) {
            Arrays.fill(bytes, (byte) 0);
            String message = error.getMessage();
            call.reject(message != null && message.matches("native-export-[a-z0-9-]+")
                ? message
                : "native-export-write-failed");
        }
    }

    @PluginMethod
    public void shareFiles(PluginCall call) {
        JSArray requests = call.getArray("files");
        if (requests == null || requests.length() == 0 || requests.length() > MAX_SHARED_FILES) {
            call.reject("native-export-invalid-file-count");
            return;
        }

        ArrayList<ShareFile> files = new ArrayList<>();
        long totalBytes = 0;
        try {
            for (int index = 0; index < requests.length(); index += 1) {
                JSObject request = JSObject.fromJSONObject(requests.getJSONObject(index));
                ShareFile file = decodeShareFile(request, MAX_SHARED_FILE_BYTES, true);
                totalBytes += file.bytes.length;
                if (totalBytes > MAX_SHARED_TOTAL_BYTES) {
                    file.clear();
                    throw new IllegalArgumentException("native-export-file-too-large");
                }
                files.add(file);
            }

            File directory = new File(getContext().getCacheDir(), "exports");
            clearDirectory(directory);
            if (!directory.exists() && !directory.mkdirs()) {
                throw new IllegalStateException("native-export-directory-unavailable");
            }

            ArrayList<Uri> uris = new ArrayList<>();
            for (ShareFile file : files) {
                File target = writePrivateFile(directory, file);
                uris.add(FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    target
                ));
            }

            Intent intent = new Intent(Intent.ACTION_SEND_MULTIPLE)
                .setType("image/png")
                .putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            ClipData clipData = ClipData.newUri(getContext().getContentResolver(), files.get(0).name, uris.get(0));
            for (int index = 1; index < uris.size(); index += 1) {
                clipData.addItem(new ClipData.Item(uris.get(index)));
            }
            intent.setClipData(clipData);

            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().startActivity(Intent.createChooser(intent, "Share social carousel"));
                    JSObject result = new JSObject();
                    result.put("shared", true);
                    result.put("fileCount", uris.size());
                    call.resolve(result);
                } catch (Exception error) {
                    call.reject("native-export-share-unavailable");
                }
            });
        } catch (Exception error) {
            String message = error.getMessage();
            call.reject(message != null && message.matches("native-export-[a-z0-9-]+")
                ? message
                : "native-export-write-failed");
        } finally {
            for (ShareFile file : files) {
                file.clear();
            }
        }
    }

    private static ShareFile decodeShareFile(JSObject request, int maximumBytes, boolean requirePng) {
        String name = request.optString("name", "").trim();
        String mimeType = request.optString("mimeType", "").trim().toLowerCase(Locale.ROOT);
        String base64Data = request.optString("base64Data", "");
        if (!name.matches("[A-Za-z0-9][A-Za-z0-9._ -]{0,119}") || name.contains("..")) {
            throw new IllegalArgumentException("native-export-invalid-name");
        }
        if (requirePng ? !"image/png".equals(mimeType) : !MIME_TYPES.contains(mimeType)) {
            throw new IllegalArgumentException("native-export-invalid-mime");
        }
        if (base64Data.isEmpty() || base64Data.length() > MAX_BASE64_CHARS) {
            throw new IllegalArgumentException("native-export-file-too-large");
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(base64Data, Base64.NO_WRAP);
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("native-export-invalid-data");
        }
        if (bytes.length == 0 || bytes.length > maximumBytes) {
            Arrays.fill(bytes, (byte) 0);
            throw new IllegalArgumentException("native-export-file-too-large");
        }
        return new ShareFile(name, mimeType, bytes);
    }

    private static File writePrivateFile(File directory, ShareFile file) throws Exception {
        File target = new File(directory, file.name);
        if (!target.getCanonicalFile().getParentFile().equals(directory.getCanonicalFile())) {
            throw new IllegalArgumentException("native-export-invalid-name");
        }
        try (FileOutputStream output = new FileOutputStream(target)) {
            output.write(file.bytes);
            output.flush();
            output.getFD().sync();
        }
        return target;
    }

    private static void clearDirectory(File directory) {
        File[] files = directory.listFiles();
        if (files == null) return;
        for (File file : files) {
            if (file.isFile()) file.delete();
        }
    }

    private static final class ShareFile {
        final String name;
        final String mimeType;
        final byte[] bytes;

        ShareFile(String name, String mimeType, byte[] bytes) {
            this.name = name;
            this.mimeType = mimeType;
            this.bytes = bytes;
        }

        void clear() {
            Arrays.fill(bytes, (byte) 0);
        }
    }
}
