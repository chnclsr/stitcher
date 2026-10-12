package com.stitcher.app;

import android.content.Intent;
import android.provider.Settings;
import android.util.Base64;
import android.view.inputmethod.InputMethodInfo;
import android.view.inputmethod.InputMethodManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;

@CapacitorPlugin(name = "StickerKeyboard")
public class StickerKeyboardPlugin extends Plugin {
    @PluginMethod
    public void addSticker(PluginCall call) {
        String encoded = call.getString("base64");
        if (encoded == null || encoded.isEmpty()) {
            call.reject("Sticker image is empty.");
            return;
        }

        byte[] png;
        try {
            png = Base64.decode(encoded, Base64.DEFAULT);
        } catch (IllegalArgumentException exception) {
            call.reject("Sticker image could not be decoded.");
            return;
        }
        if (png.length < 8 || png[0] != (byte) 0x89 || png[1] != 0x50 || png[2] != 0x4e || png[3] != 0x47) {
            call.reject("Sticker must be a PNG image.");
            return;
        }

        File directory = new File(getContext().getFilesDir(), "stickers");
        if (!directory.exists() && !directory.mkdirs()) {
            call.reject("Could not create your sticker collection.");
            return;
        }

        File file = new File(directory, "sticker-" + System.currentTimeMillis() + ".png");
        try (FileOutputStream output = new FileOutputStream(file)) {
            output.write(png);
        } catch (IOException exception) {
            call.reject("Could not save this sticker to your keyboard.", exception);
            return;
        }

        boolean enabled = isKeyboardEnabled();
        JSObject result = new JSObject();
        result.put("message", enabled
                ? "Added on this device. Switch to stick.ai in your keyboard menu."
                : "Saved on this device. Enable stick.ai keyboard in Android Settings to use it.");
        call.resolve(result);

        if (!enabled && getActivity() != null) {
            Intent settings = new Intent(Settings.ACTION_INPUT_METHOD_SETTINGS);
            getActivity().startActivity(settings);
        }
    }

    private boolean isKeyboardEnabled() {
        InputMethodManager manager = (InputMethodManager) getContext().getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
        if (manager == null) return false;
        List<InputMethodInfo> methods = manager.getEnabledInputMethodList();
        for (InputMethodInfo method : methods) {
            if (getContext().getPackageName().equals(method.getPackageName())) return true;
        }
        return false;
    }
}
