package com.example.hellotodo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFFFAFAFA) // 延续你最爱的硬朗纯白底色
                ) {
                    TodoTestScreen()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodoTestScreen() {
    // 状态管理：输入框文本与任务列表数据
    var textInput by remember { mutableStateOf("") }
    val todoList = remember { mutableStateListOf<String>() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        // 顶栏硬朗标题
        Text(
            text = "原生环境测试",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF111111),
            modifier = Modifier.padding(bottom = 20.dp)
        )

        // 输入区域 (行排列)
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertInParent
        ) {
            OutlinedTextField(
                value = textInput,
                onValueChange = { textInput = it },
                label = { Text("锁入新测试事务...") },
                modifier = Modifier.weight(1f),
                colors = TextFieldDefaults.outlinedTextFieldColors(
                    focusedBorderColor = Color(0xFF111111),
                    focusedLabelColor = Color(0xFF111111)
                )
            )

            Spacer(modifier = Modifier.width(12.dp))

            // 原生硬朗纯黑按钮
            Button(
                onClick = {
                    if (textInput.isNotBlank()) {
                        todoList.add(0, textInput.trim()) // 塞入列表顶部
                        textInput = "" // 清空输入框
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF111111)),
                shape = RoundedCornerShape(6.dp),
                modifier = Modifier.height(56.dp)
            ) {
                Text("添加", color = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 高效原生滚动列表 (相当于 Web 的 ul-li 局部滚动)
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(todoList) { todoItem ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(6.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE8E8E8))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = todoItem,
                            fontSize = 16.sp,
                            color = Color(0xFF111111)
                        )

                        // 简约点选清除按钮
                        TextButton(onClick = { todoList.remove(todoItem) }) {
                            Text("删除", color = Color(0xFFFF3B30))
                        }
                    }
                }
            }
        }
    }
}