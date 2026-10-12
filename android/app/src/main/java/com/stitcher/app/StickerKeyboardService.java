package com.stitcher.app;

import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.widget.Button;
import android.widget.GridLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import androidx.core.view.inputmethod.EditorInfoCompat;
import androidx.core.view.inputmethod.InputContentInfoCompat;
import androidx.core.view.inputmethod.InputConnectionCompat;

import android.inputmethodservice.InputMethodService;
import android.content.ClipDescription;

import java.io.File;
import java.util.Arrays;
import java.util.Comparator;

public class StickerKeyboardService extends InputMethodService {
    private static final int INK = Color.rgb(48, 42, 44);
    private static final int PAPER = Color.rgb(255, 250, 242);
    private static final int CORAL = Color.rgb(217, 120, 96);
    private LinearLayout keyboardRoot;
    private GridLayout stickerGrid;

    @Override
    public View onCreateInputView() {
        keyboardRoot = new LinearLayout(this);
        keyboardRoot.setOrientation(LinearLayout.VERTICAL);
        keyboardRoot.setPadding(dp(12), dp(10), dp(12), dp(12));
        keyboardRoot.setBackgroundColor(PAPER);

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = new TextView(this);
        title.setText("stick.ai stickers");
        title.setTextColor(INK);
        title.setTextSize(16);
        title.setTypeface(null, 1);
        header.addView(title, new LinearLayout.LayoutParams(0, dp(42), 1));

        Button switchButton = new Button(this);
        switchButton.setText("Switch keyboard");
        switchButton.setTextSize(12);
        switchButton.setOnClickListener(view -> switchToNextInputMethod(false));
        header.addView(switchButton, new LinearLayout.LayoutParams(-2, dp(42)));
        keyboardRoot.addView(header);

        ScrollView scroll = new ScrollView(this);
        stickerGrid = new GridLayout(this);
        stickerGrid.setColumnCount(4);
        scroll.addView(stickerGrid);
        keyboardRoot.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        populateStickers();
        return keyboardRoot;
    }

    @Override
    public void onStartInputView(EditorInfo info, boolean restarting) {
        super.onStartInputView(info, restarting);
        populateStickers();
    }

    private void populateStickers() {
        if (stickerGrid == null) return;
        stickerGrid.removeAllViews();
        File directory = new File(getFilesDir(), "stickers");
        File[] files = directory.listFiles((dir, name) -> name.endsWith(".png"));
        if (files == null || files.length == 0) {
            TextView empty = new TextView(this);
            empty.setText("Your stickers will show up here.");
            empty.setTextColor(INK);
            empty.setTextSize(14);
            empty.setGravity(Gravity.CENTER);
            stickerGrid.addView(empty, new GridLayout.LayoutParams());
            return;
        }
        Arrays.sort(files, Comparator.comparingLong(File::lastModified).reversed());
        for (File file : files) {
            ImageView sticker = new ImageView(this);
            sticker.setImageBitmap(BitmapFactory.decodeFile(file.getAbsolutePath()));
            sticker.setScaleType(ImageView.ScaleType.FIT_CENTER);
            sticker.setContentDescription("Insert sticker");
            GradientDrawable background = new GradientDrawable();
            background.setColor(Color.WHITE);
            background.setCornerRadius(dp(12));
            background.setStroke(dp(1), 0xFFE7D6C7);
            sticker.setBackground(background);
            sticker.setPadding(dp(8), dp(8), dp(8), dp(8));
            sticker.setOnClickListener(view -> insertSticker(file));
            GridLayout.LayoutParams params = new GridLayout.LayoutParams();
            params.width = 0;
            params.height = dp(78);
            params.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
            params.setMargins(dp(4), dp(4), dp(4), dp(4));
            stickerGrid.addView(sticker, params);
        }
    }

    private void insertSticker(File file) {
        EditorInfo editor = getCurrentInputEditorInfo();
        InputConnection connection = getCurrentInputConnection();
        String[] supportedTypes = editor == null ? new String[0] : EditorInfoCompat.getContentMimeTypes(editor);
        boolean acceptsPng = Arrays.stream(supportedTypes).anyMatch(type ->
                "image/png".equals(type) || "image/*".equals(type) || "*/*".equals(type));
        if (!acceptsPng || connection == null) {
            Toast.makeText(this, "This text field cannot receive stickers. Try a chat app.", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", file);
            ClipDescription description = new ClipDescription("stick.ai sticker", new String[] { "image/png" });
            InputContentInfoCompat content = new InputContentInfoCompat(uri, description, null);
            boolean inserted = InputConnectionCompat.commitContent(connection, editor, content,
                    InputConnectionCompat.INPUT_CONTENT_GRANT_READ_URI_PERMISSION, null);
            if (!inserted) Toast.makeText(this, "Could not add sticker to this field.", Toast.LENGTH_SHORT).show();
        } catch (IllegalArgumentException exception) {
            Toast.makeText(this, "Could not open this sticker.", Toast.LENGTH_SHORT).show();
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
