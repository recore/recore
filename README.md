# Recore Framework

**Recore 是面向中后台前端开发的开箱即用的前端框架。**

Recore 是基于 React 生态，提供完整应用开发能力，包括数据流、双向绑定、快速视图、路由、复杂模型抽象、服务调用等，是一套完整解决方案。

Recore 将同时和可视化搭建进行深度整合，共同提供高效开发方式。

---

🔥 Recore 的开源工作正在紧张的进行中，我们会逐渐完善相关的配套工具和文档，敬请期待。

---

## Feature

* 开箱即用，集成通用业务方案
* 异步响应式数据流，内置精简 mobx，并异步化改造
* VisionX 响应式视图，与可视化搭建打通，并配合响应式数据流高性能视图渲染
* 集成针对 react 16.4 优化后的 react-router，收纳为配置式 + 约定式路由
* 支持组件开发
* TypeScript 支持、VSCode 插件支持

## 使用

```sh
npm init @recore your-project
```

详见 [快速上手](https://www.yuque.com/recore/docs/quick-start) 文档。

## 竞品对比

Feature | Recore | Angular | Vue | UmiJS
------- | ------ | ------- | --- | -----
视图     | ![](https://st.onbing.com/?c=green&t=VisionX) | html+ | html+ | React
数据流   | ![](https://st.onbing.com/?c=green&t=异步响应式) | rxjs | 异步响应式 | dva（基于 redux）
双向绑定  | ![](https://st.onbing.com/?c=green&t=Yes)  | Yes | Yes | -
路由 | ![](https://st.onbing.com/?c=green&t=配置式) | 注解 | vue-router | 配置式 + 约定式
路由页按需加载 | ![](https://st.onbing.com/?c=green&t=Yes) | - | - | Yes
响应式表单 | ![](https://st.onbing.com/?c=orange&t=Doing)| Yes | - | -
动态表单 | ![](https://st.onbing.com/?c=orange&t=Doing) | Yes | - | -
服务调用 | ![](https://st.onbing.com/?c=green&t=Shimmer) | HttpClient | 随意 | 随意
服务接口定义 | ![](https://st.onbing.com/?c=green&t=Shimmer) | - | - | 随意
数据 Mock | ![](https://st.onbing.com/?c=green&t=Shimmer) | - | - | Node Express
Service Worker | ![](https://st.onbing.com/?c=red&t=No) | Yes | - | -
服务端渲染 | ![](https://st.onbing.com/?c=red&t=未计划) | Yes | Yes | -
封装组件 | ![](https://st.onbing.com/?c=green&t=Yes) | Yes | Yes | -
生态 | ![](https://st.onbing.com/?c=green&t=React) | Angular | Vue | React
命令行工具 | ![](https://st.onbing.com/?c=green&t=nowa) | ng | vue-cli | umi-cli
Chrome Devtools | ![](https://st.onbing.com/?c=orange&t=Doing) | - | Yes | -
VSCode Plugin | ![](https://st.onbing.com/?c=green&t=Yes) | Yes | Yes | -
Testing | ![](https://st.onbing.com/?c=orange&t=Doing) | Yes | Yes | -
可视化布局 | ![](https://st.onbing.com/?c=orange&t=Doing) | - | - | -

