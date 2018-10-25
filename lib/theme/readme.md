```json
{
    "--focus-c": "#f36b12", // focus 颜色（组件）
    "--hover-c": "#6c7075", // hover 颜色（组件）
    "--disabled-c": "#7d7d7d", // disabled 时的字体、边框等等颜色（组件）
    "--border-c": "#867e7e", // 通用 border 颜色（组件）
    "--border-dark-c": "#a29e9e", // 较深的边框颜色 （panel 边框）

    "--panel-focus-c": "#e2e1e1", // 内部节点等 focus 颜色（panel）
    "--panel-hover-c": "#6c7075", // 内部节点等 hover 颜色（panel）

    "--main-dark-bg": "#e2e1e1", // 较深的基础背景颜色
    "--main-bg": "white", // 较浅的基础背景色
    "--default-text-c": "#383636", // 默认字体颜色

    "--border-radius-n": "0.25em", // 通用圆角大小
    "--opacity-n": "0.6", // 控制 disabled 时的组件透明度
  
    "--image-bg": "linear-gradient(#d8d3d3, #b3b1b1)", // 凸型 按钮背景
    "--image-light-bg": "linear-gradient(#c1bfbf, #9e9898)", // 凸型 按钮 hover 背景

    // 一些默认的颜色值
    "--red-c": "#FF8080",
    "--green-c": "#5ADD94",
    "--blue-c": "#3d85c6",
}
```

### 统一界面颜色，插件样式书写细则

1. 基础颜色例如背景色等等统一用 css 变量可控的颜色，特殊元素可以自定义颜色；
2. 尽量不要去自定义字体颜色，直接继承，除非某些需要强调的可以自定义颜色；
3. 一些特殊效果不要去依赖默认的背景色或者字体颜色，因为这些都是会变化的.

如下例，这是节点选中高亮的样式设置，但是这个颜色很深，和字体颜色浅的搭配尚可，然而一旦字体颜色更改为较深的颜色，效果就会变得不理想，特殊效果如果设置了背景色，记得把颜色字体一起更改。并且切换主题看下颜色设置是否能在浅色和深色主题下，都可以比较清晰；

```css
:host([focused]) {
    .tree {
        .treenode[active="true"] {
            background-color: #059;
            color: 
        }
    }
}
```

4. 为了避免出现意外情况，可以尽量写上默认值，不写也可以;

使用示例：
```css
:host {
  border-color: var(--border-dark-c, #999);
  background-image: var(--image-bg);
}

:host(:hover) {
  background-image: var(--image-light-bg);
  color: var(--hover-c);
}
```