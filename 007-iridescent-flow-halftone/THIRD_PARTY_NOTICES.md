# Third-party notices

本模板包含或改编自以下开源项目：

| 组件 | 固定版本 | 用途 | 许可证 |
|---|---|---|---|
| [collidingScopes/liquid-shape-distortions](https://github.com/collidingScopes/liquid-shape-distortions) | `a30cc65745d81a89b40cde01c85a2e59d3fb5cf6` | WebGL 初始化、3D simplex noise、fBm、液态形变、控制和导出结构 | MIT；见 `LICENSE-UPSTREAM.txt` |
| [mrdoob/three.js DotScreenShader](https://github.com/mrdoob/three.js/blob/19567418fa4c798413d22c19b215171f3eaadb4c/examples/jsm/shaders/DotScreenShader.js) | `19567418fa4c798413d22c19b215171f3eaadb4c` | 网点公式；本模板扩展为三个旋转 RGB 色版 | MIT；见 `LICENSE-THREE.txt` |
| [Erkaman/glsl-cos-palette](https://github.com/Erkaman/glsl-cos-palette) | `2183c2352891f08afe6b7f27e29119a6e9ca78ec` | Inigo Quilez cosine palette 的 GLSL 实现 | MIT；见 `LICENSE-PALETTE.txt` |
| [Vanilagy/mp4-muxer](https://github.com/Vanilagy/mp4-muxer) | 上游仓库 vendored build | 浏览器内 MP4 封装 | MIT；见 `LICENSE-MP4-MUXER.txt` |

上游版权声明和许可证文本必须与代码一起保留。对上游代码的适配包括：移除音乐、遥测和运行时 CDN；添加固定 seed、六组确定性配方、自制参数面板、cosine palette，以及 RGB dot-screen 参数。
