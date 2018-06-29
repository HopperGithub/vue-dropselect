# vue-dropselect

> A vue select component have multi features，by override element-ui select component.

## Update Log
- 支持两种模式，分页 | 滚动条，为减轻网络、渲染、性能压力推荐使用（分页模式）。
- 扩展支持场景：（注：以上两种模式均支持以下场景，减少对服务端分页、搜索等功能的依赖）
  - 远程不提供分页的场景
  - 远程不提搜索的场景
  - 远程不提搜索、分页的场景  
（以上场景均可通过 promise 计算分页解决，实现很简单就不举例了，设置 remote 为 true 就可以开启本地搜索）
- 支持远程搜索、本地搜索的搜索功能。
- 支持键盘选择、删除、控制（多选时，通过Backspace键选中最后一个Tag，Delete键确认移除）
- 提升性能，Element-UI 1.x 官方已停止维护，结合 Element-UI 2.0 进行了一系列逻辑性能优化。
（如：优化 change 事件、form 表单验证 change 事件触发时机，解决Element-UI 2.0 以前的版本，select组件，在option销毁时，可能发生resetIndex事件频繁 emit 导致 vue-devTool crash 的bug。(issue: https://github.com/ElemeFE/element/issues/5790) 等等）
- 增加进行搜索时的函数去抖。

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report

# run unit tests
npm run unit

# run e2e tests
npm run e2e

# run all tests
npm test
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
