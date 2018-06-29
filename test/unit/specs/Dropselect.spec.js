import Vue from 'vue'
import Dropselect from '@/dropselect/src/main'

describe('Dropselect.vue', () => {
  it('should has correct name', () => {
    const Constructor = Vue.extend(Dropselect)
    const vm = new Constructor().$mount()
    expect(vm.name)
      .toEqual('Dropselect')
  })
})
