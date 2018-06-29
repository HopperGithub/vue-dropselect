// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'

import 'element-theme-default'
import ElementUI from 'element-ui'

import Dropselect from './dropselect'

Vue.config.productionTip = false

Vue.use(ElementUI)
Vue.use(Dropselect)

/* eslint-disable no-new */
new Vue({
    el: '#app',
    components: { App },
    template: '<App/>'
})
