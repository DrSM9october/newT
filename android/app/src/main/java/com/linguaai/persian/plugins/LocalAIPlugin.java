package com.linguaai.persian.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocalAI")
public class LocalAIPlugin extends Plugin {

    private LocalAIManager aiManager;

    @Override
    public void load() {
        super.load();

        try {
            aiManager = new LocalAIManager(getContext());
        } catch (Exception e) {
            android.util.Log.e(
                    "LocalAIPlugin",
                    "Failed to initialize LocalAIManager",
                    e
            );
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();

        try {
            result.put("bridgeReady", true);

            if (aiManager == null) {
                result.put("engineReady", false);
                result.put("modelLoaded", false);
                result.put("loadedModelId", JSObject.NULL);
                result.put("modelsInstalled", 0);

                call.resolve(result);
                return;
            }

            result.put(
                    "engineReady",
                    aiManager.isEngineReady()
            );

            result.put(
                    "modelLoaded",
                    aiManager.isModelLoaded()
            );

            String loadedModelId =
                    aiManager.getLoadedModelId();

            if (loadedModelId == null) {
                result.put(
                        "loadedModelId",
                        JSObject.NULL
                );
            } else {
                result.put(
                        "loadedModelId",
                        loadedModelId
                );
            }

            /*
             * getInstalledModels() returns String[].
             *
             * Java arrays use .length, not .length().
             */
            String[] installedModels =
                    aiManager.getInstalledModels();

            result.put(
                    "modelsInstalled",
                    installedModels != null
                            ? installedModels.length
                            : 0
            );

            call.resolve(result);

        } catch (Exception e) {

            android.util.Log.e(
                    "LocalAIPlugin",
                    "Failed to get LocalAI status",
                    e
            );

            call.reject(
                    "Failed to get LocalAI status: "
                            + e.getMessage()
            );
        }
    }
}
