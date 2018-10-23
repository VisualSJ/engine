```json
{
    "--focus-c": "#f36b12", // focus 颜色
    "--hover-c": "#6c7075", // hover 颜色
    "--disabled-c": "#7d7d7d", // disabled 时的颜色边框等等颜色
    "--border-c": "#867e7e", // 通用 border 颜色（组件）
    "--border-dark-c": "#a29e9e", // 较深的边框颜色 （panel 边框）
    "--main-dark-bg": "#e2e1e1", // 较深的背景颜色
    "--main-bg": "white", // 较浅的基础背景色
    "--default-text-c": "#383636", // 默认字体颜色
  
    "--red-c": "#FF8080",
    "--green-c": "#5ADD94",
    "--blue-c": "#3d85c6",
  
    "--border-radius-n": "0.25em", // 通用圆角大小
    "--opacity-n": "0.6", // 控制 disabled 时的组件透明度
  
    "--image-bg": "linear-gradient(#d8d3d3, #b3b1b1)", // 凸型 按钮背景
    "--image-light-bg": "linear-gradient(#c1bfbf, #9e9898)" // 凸型 按钮 hover 背景
}
```

### 统一管理界面颜色原则

1. 基础颜色例如背景色等等统一用 css 变量可控的颜色，特殊元素可以自定义颜色；
2. 尽量不要去自定义字体颜色，直接继承，除非某些需要强调的可以自定义颜色；