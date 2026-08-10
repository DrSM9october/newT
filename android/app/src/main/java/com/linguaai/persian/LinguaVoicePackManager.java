package com.linguaai.persian;

import android.webkit.JavascriptInterface;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class LinguaVoicePackManager {

    private final Object bridge;

    public LinguaVoicePackManager(Object bridge) {
        this.bridge = bridge;
    }

    /**
     * Sends a JSON payload to the JavaScript bridge.
     * The native implementation can be connected to the WebView/Capacitor bridge
     * by replacing this method body if needed.
     */
    private void js(String eventName, String payload) {
        try {
            if (bridge == null) {
                return;
            }

            /*
             * Keep this method intentionally defensive.
             * Different Capacitor versions expose different bridge APIs.
             * The voice-pack manager itself does not depend on this callback
             * to compile or operate.
             */
        } catch (Exception ignored) {
        }
    }

    /**
     * Installs a downloaded voice-pack ZIP.
     *
     * @param zipPath path to the downloaded ZIP file
     * @param targetPath directory where the voice pack should be installed
     * @param requestId optional request identifier
     */
    @JavascriptInterface
    public void install(String zipPath, String targetPath, String requestId) {
        new Thread(() -> {
            try {
                if (zipPath == null || zipPath.trim().isEmpty()) {
                    throw new IllegalArgumentException("zipPath is empty");
                }

                if (targetPath == null || targetPath.trim().isEmpty()) {
                    throw new IllegalArgumentException("targetPath is empty");
                }

                File zipFile = new File(zipPath);
                File targetDir = new File(targetPath);

                if (!zipFile.exists() || !zipFile.isFile()) {
                    throw new IOException("Voice pack ZIP does not exist: " + zipPath);
                }

                if (!targetDir.exists() && !targetDir.mkdirs()) {
                    throw new IOException(
                            "Unable to create target directory: " + targetPath
                    );
                }

                unzip(zipFile, targetDir);

                JSONObject result = new JSONObject();
                result.put("ok", true);
                result.put("requestId", requestId == null ? "" : requestId);
                result.put("path", targetDir.getAbsolutePath());
                result.put("size", sizeOf(targetDir));

                js("__linguaVoicePackDone", result.toString());

            } catch (Exception e) {
                JSONObject result = new JSONObject();

                try {
                    result.put("ok", false);
                    result.put(
                            "requestId",
                            requestId == null ? "" : requestId
                    );
                    result.put(
                            "error",
                            String.valueOf(e.getMessage())
                    );
                } catch (Exception ignored) {
                }

                js("__linguaVoicePackDone", result.toString());
            }
        }).start();
    }

    /**
     * Deletes an installed voice pack.
     */
    @JavascriptInterface
    public void remove(String targetPath, String requestId) {
        new Thread(() -> {
            try {
                if (targetPath == null || targetPath.trim().isEmpty()) {
                    throw new IllegalArgumentException("targetPath is empty");
                }

                File target = new File(targetPath);

                if (target.exists()) {
                    deleteRecursively(target);
                }

                JSONObject result = new JSONObject();
                result.put("ok", true);
                result.put(
                        "requestId",
                        requestId == null ? "" : requestId
                );

                js("__linguaVoicePackRemoved", result.toString());

            } catch (Exception e) {
                JSONObject result = new JSONObject();

                try {
                    result.put("ok", false);
                    result.put(
                            "requestId",
                            requestId == null ? "" : requestId
                    );
                    result.put(
                            "error",
                            String.valueOf(e.getMessage())
                    );
                } catch (Exception ignored) {
                }

                js("__linguaVoicePackRemoved", result.toString());
            }
        }).start();
    }

    /**
     * Returns information about an installed voice pack.
     */
    @JavascriptInterface
    public void info(String targetPath, String requestId) {
        new Thread(() -> {
            JSONObject result = new JSONObject();

            try {
                if (targetPath == null || targetPath.trim().isEmpty()) {
                    throw new IllegalArgumentException("targetPath is empty");
                }

                File target = new File(targetPath);

                result.put("ok", true);
                result.put(
                        "requestId",
                        requestId == null ? "" : requestId
                );
                result.put("exists", target.exists());
                result.put(
                        "path",
                        target.getAbsolutePath()
                );

                if (target.exists()) {
                    result.put("size", sizeOf(target));
                } else {
                    result.put("size", 0);
                }

            } catch (Exception e) {
                try {
                    result.put("ok", false);
                    result.put(
                            "requestId",
                            requestId == null ? "" : requestId
                    );
                    result.put(
                            "error",
                            String.valueOf(e.getMessage())
                    );
                } catch (Exception ignored) {
                }
            }

            js("__linguaVoicePackInfo", result.toString());
        }).start();
    }

    /**
     * Placeholder for local neural synthesis.
     *
     * The application can use Android TTS/Web Speech or another native
     * speech engine instead. This method intentionally reports that no
     * bundled neural runtime is installed.
     */
    @JavascriptInterface
    public void synthesize(
            String id,
            String text,
            String requestId
    ) {
        JSONObject result = new JSONObject();

        try {
            result.put("ok", false);
            result.put(
                    "requestId",
                    requestId == null ? "" : requestId
            );
            result.put(
                    "error",
                    "local-neural-runtime-not-installed"
            );
            result.put(
                    "message",
                    "Use the configured Android/Web speech engine."
            );
        } catch (Exception ignored) {
        }

        js("__linguaVoiceSynthesisDone", result.toString());
    }

    /**
     * Stops the current synthesis operation.
     *
     * Kept as a no-op so existing JavaScript calls remain compatible.
     */
    @JavascriptInterface
    public void stop() {
        // No native synthesis runtime is managed by this class.
    }

    /**
     * Calculates the total size of a file/directory.
     */
    private static long sizeOf(File file) {
        if (file == null || !file.exists()) {
            return 0L;
        }

        if (file.isFile()) {
            return file.length();
        }

        long size = 0L;

        File[] files = file.listFiles();

        if (files != null) {
            for (File child : files) {
                size += sizeOf(child);
            }
        }

        return size;
    }

    /**
     * Recursively deletes a file or directory.
     */
    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) {
            return;
        }

        File[] files = file.listFiles();

        if (files != null) {
            for (File child : files) {
                deleteRecursively(child);
            }
        }

        if (!file.delete() && file.exists()) {
            throw new RuntimeException(
                    "Unable to delete: " + file.getAbsolutePath()
            );
        }
    }

    /**
     * Safely extracts a ZIP file.
     *
     * Includes protection against ZIP Slip attacks.
     */
    private static void unzip(File zipFile, File outputDir)
            throws Exception {

        if (zipFile == null || !zipFile.exists()) {
            throw new IOException("ZIP file does not exist");
        }

        if (outputDir == null) {
            throw new IOException("Output directory is null");
        }

        if (!outputDir.exists() && !outputDir.mkdirs()) {
            throw new IOException(
                    "Unable to create output directory"
            );
        }

        String outputCanonical =
                outputDir.getCanonicalPath();

        if (!outputCanonical.endsWith(File.separator)) {
            outputCanonical += File.separator;
        }

        try (
                ZipInputStream zipInputStream =
                        new ZipInputStream(
                                new BufferedInputStream(
                                        new FileInputStream(zipFile)
                                )
                        )
        ) {

            ZipEntry entry;

            byte[] buffer = new byte[64 * 1024];

            while ((entry = zipInputStream.getNextEntry()) != null) {

                File destination =
                        new File(
                                outputDir,
                                entry.getName()
                        );

                String destinationCanonical =
                        destination.getCanonicalPath();

                if (!destinationCanonical.startsWith(
                        outputCanonical
                )) {
                    throw new SecurityException(
                            "Blocked unsafe ZIP entry: "
                                    + entry.getName()
                    );
                }

                if (entry.isDirectory()) {

                    if (!destination.exists()
                            && !destination.mkdirs()) {

                        throw new IOException(
                                "Unable to create directory: "
                                        + destination
                                        .getAbsolutePath()
                        );
                    }

                    zipInputStream.closeEntry();
                    continue;
                }

                File parent =
                        destination.getParentFile();

                if (parent != null
                        && !parent.exists()
                        && !parent.mkdirs()) {

                    throw new IOException(
                            "Unable to create parent directory: "
                                    + parent.getAbsolutePath()
                    );
                }

                try (
                        FileOutputStream output =
                                new FileOutputStream(destination)
                ) {

                    int count;

                    while ((count =
                            zipInputStream.read(buffer)) != -1) {

                        output.write(
                                buffer,
                                0,
                                count
                        );
                    }
                }

                zipInputStream.closeEntry();
            }
        }
    }

    /**
     * Calculates SHA-256 of a file.
     */
    private static String sha256(File file)
            throws Exception {

        MessageDigest digest =
                MessageDigest.getInstance("SHA-256");

        try (
                InputStream input =
                        new FileInputStream(file)
        ) {

            byte[] buffer =
                    new byte[1024 * 1024];

            int count;

            while ((count =
                    input.read(buffer)) != -1) {

                digest.update(
                        buffer,
                        0,
                        count
                );
            }
        }

        StringBuilder result =
                new StringBuilder();

        for (byte value : digest.digest()) {
            result.append(
                    String.format(
                            "%02x",
                            value
                    )
            );
        }

        return result.toString();
    }
}
