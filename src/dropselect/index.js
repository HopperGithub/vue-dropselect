import Dropselect from './src/main'

/* istanbul ignore next */
Dropselect.install = function (Vue) {
    Vue.component(Dropselect.name, Dropselect)
}

export default Dropselect
