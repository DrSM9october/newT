package __PACKAGE__;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public final class LinguaVoicePackManager {
    private final Context context;
    private final WebView webView;
    private final File root;
    private final Handler main = new Handler(Looper.getMainLooper());

    public LinguaVoicePackManager(Context context, WebView webView) {
        this.context = context.getApplicationContext();
        this.webView = webView;
        this.root = new File(this.context.getFilesDir(), "voices");
        if (!root.exists()) root.mkdirs();
    }

    private File packDir(String id) { return new File(root, id.replaceAll("[^a-zA-Z0-9_-]", "_")); }
    private void js(String fn, String json) {
        main.post(() -> webView.evaluateJavascript("window." + fn + " && window." + fn + "(" + JSONObject.quote(json) + ")", null));
    }

    @JavascriptInterface public void list() {
        try {
            JSONArray arr = new JSONArray();
            File[] dirs = root.listFiles();
            if (dirs != null) for (File d : dirs) if (d.isDirectory()) {
                JSONObject o = new JSONObject(); o.put("id", d.getName()); o.put("status", "installed"); o.put("installedBytes", sizeOf(d));
                arr.put(o);
            }
            js("__linguaVoicePackList", arr.toString());
        } catch (Exception e) { js("__linguaVoicePackList", "[]"); }
    }

    @JavascriptInterface public void status(String id) { try { JSONObject o=new JSONObject(); o.put("id",id); o.put("status",packDir(id).isDirectory()?"installed":"not-installed"); js("__linguaVoicePackStatus",o.toString()); } catch(Exception ignored){} }

    @JavascriptInterface public void remove(String id) {
        deleteRecursively(packDir(id));
        js("__linguaVoicePackDone", "{\"ok\":true}");
    }

    @JavascriptInterface public void download(String id, String url, String expectedSha256, boolean licenseAccepted) {
        if (!licenseAccepted) { js("__linguaVoicePackDone", "{\"ok\":false,\"error\":\"license-not-accepted\"}"); return; }
        new Thread(() -> {
            File tmp = new File(root, id + ".download");
            File target = packDir(id);
            try {
                if (!url.startsWith("https://")) throw new IllegalArgumentException("Voice Pack URL must use HTTPS");
                HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();
                c.setConnectTimeout(20000); c.setReadTimeout(60000); c.setRequestProperty("Accept","application/zip,application/octet-stream");
                long total=c.getContentLengthLong(); long existing=tmp.exists()?tmp.length():0;
                if(existing>0) c.setRequestProperty("Range","bytes="+existing+"-");
                int code=c.getResponseCode(); if(code!=200 && code!=206) throw new IllegalStateException("HTTP "+code);
                boolean append=existing>0 && code==206;
                try(InputStream in=new BufferedInputStream(c.getInputStream()); FileOutputStream out=new FileOutputStream(tmp,append)){
                    byte[] b=new byte[1024*1024]; int n; long done=existing;
                    while((n=in.read(b))!=-1){out.write(b,0,n); done+=n; final long fdone=done; final long ftotal=total>0?(append?existing+total:total):0; js("__linguaVoicePackProgress", new JSONObject().put("id",id).put("bytes",fdone).put("total",ftotal).toString());}
                }
                if(expectedSha256!=null && !expectedSha256.isEmpty() && !expectedSha256.equalsIgnoreCase(sha256(tmp))) throw new IllegalStateException("SHA-256 mismatch");
                File staging=new File(root,id+".staging"); deleteRecursively(staging); staging.mkdirs(); unzip(tmp,staging); deleteRecursively(target); if(!staging.renameTo(target)) throw new IllegalStateException("Could not install pack"); tmp.delete();
                js("__linguaVoicePackDone", "{\"ok\":true}");
            } catch(Exception e){ js("__linguaVoicePackDone", "{\"ok\":false,\"error\":" + JSONObject.quote(String.valueOf(e.getMessage())) + "}"); }
        }).start();
    }

    @JavascriptInterface public void synthesize(String id, String text, String requestId) {
        // Model inference is intentionally isolated. A pack is considered installed only after extraction,
        // but this bridge does not pretend that a Python/PyTorch model can run natively. The final pack must
        // provide an Android-compatible native/ONNX runtime implementation before this method returns audio.
        JSONObject o=new JSONObject(); try { o.put("ok",false); o.put("requestId",requestId); o.put("error","local-neural-runtime-not-installed"); } catch(Exception ignored){}
        js("__linguaVoicePackDone",o.toString());
    }
    @JavascriptInterface public void stop() { }

    private static long sizeOf(File f){ if(f.isFile()) return f.length(); long s=0; File[] fs=f.listFiles(); if(fs!=null) for(File x:fs)s+=sizeOf(x); return s; }
    private static void deleteRecursively(File f){ if(!f.exists())return; File[] fs=f.listFiles(); if(fs!=null)for(File x:fs)deleteRecursively(x); f.delete(); }
    private static void unzip(File zip, File out) throws Exception { try(ZipInputStream zin=new ZipInputStream(new BufferedInputStream(new FileInputStream(zip)))){ ZipEntry e; byte[] b=new byte[64*1024]; while((e=zin.getNextEntry())!=null){ File dest=new File(out,e.getName()); String cp=dest.getCanonicalPath(); if(!cp.startsWith(out.getCanonicalPath()+File.separator)) throw new SecurityException("zip-slip"); if(e.isDirectory()){dest.mkdirs();continue;} File parent=dest.getParentFile();if(parent!=null)parent.mkdirs();try(FileOutputStream fos=new FileOutputStream(dest)){int n;while((n=zin.read(b))!=-1)fos.write(b,0,n);} } } }
    private static String sha256(File f) throws Exception { MessageDigest md=MessageDigest.getInstance("SHA-256"); try(InputStream in=new FileInputStream(f)){byte[] b=new byte[1024*1024];int n;while((n=in.read(b))!=-1)md.update(b,0,n);} StringBuilder s=new StringBuilder();for(byte x:md.digest())s.append(String.format("%02x",x));return s.toString(); }
}
