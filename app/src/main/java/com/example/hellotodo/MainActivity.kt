package com.example.hellotodo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import com.example.hellotodo.ui.theme.HelloTodoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 1. 启用边缘到边缘（沉浸式），这样图片才能真正铺满到状态栏和导航栏下方
        enableEdgeToEdge()
        setContent {
            HelloTodoTheme {
                // 2. 满屏容器
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    // 这里故意不使用 innerPadding，从而让图片完全忽略安全区域，做到极致的全屏
                    FullScreenImage()
                }
            }
        }
    }
}

@Composable
fun FullScreenImage() {
    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            // 3. 绑定你的图片资源 kcb.png
            painter = painterResource(id = R.drawable.kcb),
            contentDescription = "Full Screen Background",
            modifier = Modifier.fillMaxSize(),
            // 4. 关键：ContentScale.Crop 会裁剪并拉伸图片，确保整个屏幕没有任何白边
            contentScale = ContentScale.Crop
        )
    }
}

@Preview(showBackground = true)
@Composable
fun FullScreenImagePreview() {
    HelloTodoTheme {
        FullScreenImage()
    }
}