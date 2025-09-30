---
title: "Mermaid 图表测试"
pubDate: '2025/09/30'
description: '测试 Mermaid 图表在黑色背景下的显示效果'
tags: ["Mermaid", "图表", "可视化"]
---

# Mermaid 图表测试

本文用于测试 Mermaid 图表在黑色背景下的显示效果。

## 流程图示例

<pre class="mermaid">
graph TD
    A[开始] --> B{条件判断}
    B -->|条件1| C[执行操作1]
    B -->|条件2| D[执行操作2]
    C --> E[结束]
    D --> E
</pre>

## 序列图示例

<pre class="mermaid">
sequenceDiagram
    participant 用户
    participant 系统
    participant 数据库
    
    用户->>系统: 登录请求
    系统->>数据库: 验证用户信息
    数据库-->>系统: 返回验证结果
    系统-->>用户: 登录成功/失败
</pre>

## 类图示例

<pre class="mermaid">
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal: +int age
    Animal: +String gender
    Animal: +isMammal()
    
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    
    class Fish{
        -int sizeInFeet
        -canEat()
    }
</pre>

## 饼图示例

<pre class="mermaid">
pie
    title 项目技术栈分布
    "Astro" : 40
    "Tailwind CSS" : 30
    "Three.js" : 20
    "其他" : 10
</pre>