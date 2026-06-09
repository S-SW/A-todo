package com.example.hellotodo // <-- 确保这是你的实际包名

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.ViewGroup
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. 开启最标准的沉浸式全面屏：状态栏透明，图标显示为深色（防止电量变白看不清）
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        val decorView = window.decorView
        WindowCompat.getInsetsController(window, decorView).isAppearanceLightStatusBars = true

        // 2. 创建 WebView 实例
        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        setContentView(webView)

        // ===== 3. 完美的 WebView 兼容性参数配置 =====
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        // ===== 4. 【核心改进】最高优先级的 CSS 强行注入，无视任何 fixed/sticky 干扰 =====
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                view?.loadUrl(request?.url.toString())
                return true
            }

            // 在页面一开始加载、还没渲染出来时，就强行把安全距离变量和防护顶死
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                applySystemBarFix()
            }

            // 网页加载完成后，再次巩固刷新，确保万无一失
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                applySystemBarFix()
            }
        }

        // ===== 5. 加载资产目录的主文件 =====
        webView.loadUrl("file:///android_asset/index.html")

        // ===== 6. 拦截并处理物理返回键 =====
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    /**
     * 终极修复：完美避开状态栏，且百分之百不裁剪、不挤压网页底部
     */
    private fun applySystemBarFix() {
        ViewCompat.setOnApplyWindowInsetsListener(webView) { _, windowInsets ->
            val insets = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars())
            val density = resources.displayMetrics.density
            val statusBarHeightInDp = (insets.top / density).toInt()

            if (statusBarHeightInDp > 0) {
                // 这个高精度 JS 脚本干了三件事：
                // 1. 创建一个绝对隐形、但真实存在的“挡板div”，高度刚好等于状态栏，直接塞在网页最顶部，把所有正常的流式内容挤下去。
                // 2. 针对拥有 sticky top-0 属性的 header 进行强行修正，把它们的顶端偏移从 top:0px 改为状态栏高度。
                val cssFixJs = """
                    (function() {
                        var cssVarName = '--android-status-bar-height';
                        var heightStr = '${statusBarHeightInDp + 8}px';
                        
                        // 1. 设置全局变量，以备不时之需
                        document.documentElement.style.setProperty(cssVarName, heightStr);
                        
                        // 2. 动态创建一个专门拦截重叠的防震垫垫片（如果不存在的话）
                        var spacerId = 'android-status-bar-spacer';
                        var spacer = document.getElementById(spacerId);
                        if (!spacer) {
                            spacer = document.createElement('div');
                            spacer.id = spacerId;
                            spacer.style.width = '100%';
                            spacer.style.display = 'block';
                            // 强行插入到 body 的最开始
                            document.body.insertBefore(spacer, document.body.firstChild);
                        }
                        spacer.style.height = heightStr;

                        // 3. 彻底降服被 sticky 钉死在屏幕顶部的元素（你的 header 和 历史页的导航）
                        var styleId = 'android-sticky-fix-style';
                        var styleEl = document.getElementById(styleId);
                        if (!styleEl) {
                            styleEl = document.createElement('style');
                            styleEl.id = styleId;
                            document.head.appendChild(styleEl);
                        }
                        // 强行用 !important 盖掉 Tailwind 的 top-0 样式
                        styleEl.innerHTML = 'header, nav { top: ' + heightStr + ' !important; }';
                    })();
                """.trimIndent()

                webView.evaluateJavascript(cssFixJs, null)
            }
            windowInsets
        }
    }
}