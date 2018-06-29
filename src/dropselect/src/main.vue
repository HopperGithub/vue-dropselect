<template>
    <div class="el-select"
         v-clickoutside="handleClose">
        <div class="el-select__tags"
             v-if="multiple"
             @click.stop="toggleMenu"
             ref="tags"
             :style="{ 'max-width': inputWidth - 35 + 'px' }">
            <transition-group @after-leave="resetInputHeight">
                <el-tag v-for="item in selected"
                        :key="getValueKey(item)"
                        :closable="!disabled"
                        :hit="item.hitState"
                        type="primary"
                        @close="deleteTag($event, item)"
                        close-transition>
                    <span class="el-select__tags-text">{{ item.currentLabel }}</span>
                </el-tag>
            </transition-group>
        </div>
        <el-input v-model="selectedLabel"
                  ref="reference"
                  type="text"
                  readonly
                  :placeholder="currentPlaceholder"
                  :name="name"
                  :size="size"
                  :disabled="disabled"
                  :validate-event="false"
                  :icon="iconClass"
                  @focus="visible = true"
                  @click="handleIconClick"
                  @mousedown.native="handleMouseDown"
                  @keydown.native.enter.prevent="selectOption"
                  @keydown.native.down.prevent="navigateOptions('next')"
                  @keydown.native.up.prevent="navigateOptions('prev')"
                  @keydown.native.esc.stop.prevent="visible = false"
                  @keydown.native.tab="visible = false"
                  @mouseenter.native="inputHovering = true"
                  @mouseleave.native="inputHovering = false">
        </el-input>
        <transition name="el-zoom-in-top"
                    @before-enter="handleMenuEnter"
                    @after-leave="doDestroy">
            <el-select-menu ref="popper"
                            v-show="visible && emptyText !== false">
                <el-input ref="search"
                          style="padding: 8px"
                          type="text"
                          v-if="filterable"
                          v-model.trim="search"
                          :disabled="disabled"
                          :placeholder="$t('el.transfer.filterPlaceholder')"
                          :icon="searchIconClass"
                          :validate-event="false"
                          :on-icon-click="searchChange"
                          @keydown.native.enter.prevent="selectOption"
                          @keydown.native.down.prevent="navigateOptions('next')"
                          @keydown.native.up.prevent="navigateOptions('prev')"
                          @keydown.native.delete.stop="deletePrevTag"
                          @keydown.native.esc.stop.prevent="visible = false"
                          @keydown.native.tab="visible = false">
                </el-input>
                <div class="el-select-dropdown__menu"
                     v-show="options.length > 0 && !loading && !emptyText">
                    <el-scrollbar tag="ul"
                                  wrap-class="el-select-dropdown__wrap"
                                  view-class="el-select-dropdown__list"
                                  :style="[{height: menuHeight}]"
                                  :view-style="[{height: menuHeight}]"
                                  :class="{ 'is-empty': filteredOptionsCount === 0 }"
                                  v-if="!pageable">
                        <slot></slot>
                        <el-option v-for="l in list"
                                   :key="l[valueKey]"
                                   :value="l"
                                   :disabled="l[disabledKey] || false"
                                   :label="l[labelKey]">
                            <slot name="option-slot"
                                  :option="l"
                                  :valueKey="valueKey"
                                  :labelKey="labelKey"
                                  :disabledKey="disabledKey">
                            </slot>
                        </el-option>
                    </el-scrollbar>
                    <div class="el-select-dropdown__pagination"
                         v-else>
                        <slot></slot>
                        <el-option v-for="l in list"
                                   :key="l[valueKey]"
                                   :value="l"
                                   :disabled="l[disabledKey] || false"
                                   :label="l[labelKey]">
                            <slot name="option-slot"
                                  :value="l"
                                  :valueKey="valueKey"
                                  :labelKey="labelKey"
                                  :disabledKey="disabledKey">
                            </slot>
                        </el-option>
                        <el-pagination :style="{'padding': '6px 8px', 'text-align': 'center', 'margin-top': marginTop}"
                                       small
                                       layout="prev, pager, next"
                                       :page-size="pageLimit"
                                       :total="total"
                                       :current-page.sync="currentPage"
                                       @current-change="currentChange"></el-pagination>
                    </div>
                </div>
                <p class="el-select-dropdown__empty"
                   :style="{'height': menuHeight}"
                   v-if="emptyText">{{ emptyText }}</p>
            </el-select-menu>
        </transition>
    </div>
</template>

<script>
/**
 * Dropselect：（更新日志）
 * 支持两种模式，分页 | 滚动条，为减轻网络、渲染、性能压力推荐使用（分页模式）。
 * 扩展支持场景：（注：以上两种模式均支持以下场景，减少对服务端分页、搜索等功能的依赖）
 *     远程不提供分页的场景；
 *     远程不提搜索的场景；
 *     远程不提搜索、分页的场景；
 *    （以上场景均可通过 promise 计算分页解决，实现很简单就不举例了呦，设置 remote 为 true 就可以开启本地搜索）
 * 支持远程搜索、本地搜索的搜索功能。
 * 支持键盘选择、删除、控制（多选时，通过Backspace键选中最后一个Tag，Delete键确认移除）
 * 提升性能，Element-UI 1.x 官方已停止维护，Dropselect 结合 Element-UI 2.0 进行了一系列逻辑性能优化。
 * （如：优化 change 事件、form 表单验证 change 事件触发时机，
 *      解决Element-UI 2.0 以前的版本，select组件，在option销毁时，
 *      可能发生resetIndex事件频繁 emit 导致 vue-devTool crash 的bug。
 *      (issue: https://github.com/ElemeFE/element/issues/5790) 等等）
 * 增加进行搜索时的函数去抖。
 * ----------------------------------------------------------------------
 * Attributes：（支持属性）
 *   原有属性，详情参考Element官方文档
 *     [multiple, disabled, size, clearable, multiple-limit, name, placeholder,
 *     loading-text, no-match-text, no-data-text, popper-class, default-first-option];
 *   新增属性，详情参考Props中的注释说明
 *     [search-name, search-icon-class, search-placeholder, value, filterable, pageable, pageLimit,
 *     value-Key, label-key, disabled-key, promise, mountedQuery, remote, validateEvent, itemHeight]
 * Event：（支持事件）
 *   原有属性，详情参考Element官方文档
 *     [change, visible-change, remove-tag, clear, input];
 * Simple use case：（使用案例）
 *   单选：RedPacketAward 组件 (path: components\Flowchart\steps\action\RedPacketAward.vue)
 *   多选: AddToGroup 组件 （path: components\Flowchart\steps\action\AddToGroup.vue）
 * Slot: （内容分发）
 *   支持 menu slot 功能，如静态选项：全部。
 *   举个栗子： totalItem = {id: '', name: '全部’}
 *   <dropselect v-model="modelObj" :promise="listPromise">
 *       <el-option label="全部" :value="totalItem"></el-option>
 *   </dropselect>
 */

import ElSelectMenu from './menu.vue';
import ElOption from './option.vue';
import Emitter from 'element-ui/src/mixins/emitter';
import Locale from 'element-ui/src/mixins/locale';
import Clickoutside from 'element-ui/src/utils/clickoutside';
import debounce from 'throttle-debounce/debounce';
import { addClass, removeClass, hasClass } from 'element-ui/src/utils/dom';
import { addResizeListener, removeResizeListener } from 'element-ui/src/utils/resize-event';
//    import {t} from 'element-ui/src/locale';
import scrollIntoView from 'element-ui/src/utils/scroll-into-view';
import { getValueByPath } from 'element-ui/src/utils/util';

const sizeMap = {
    'large': 42,
    'small': 30,
    'mini': 22
};

const noop = () => {
};

export default {
    mixins: [Emitter, Locale],

    name: 'Dropselect',

    componentName: 'ElSelect',

    computed: {
        marginTop () {
            let shouldNum = this.pageLimit;
            let realNum = this.list.length;
            return this.itemHeight * (shouldNum - realNum) + 'px';
        },

        menuHeight () {
            return this.itemHeight * this.pageLimit + 34 + 'px';
        },

        iconClass () {
            let criteria = this.clearable &&
                !this.disabled &&
                this.inputHovering &&
                !this.multiple &&
                this.value !== undefined &&
                (this.isObject(this.value) ? this.value[this.labelKey] && this.value[this.labelKey] !== '' : this.value !== '');
            return criteria ? 'circle-close is-show-close' : 'caret-top';
        },

        emptyText () {
            if (this.loading) {
                return this.loadingText || this.$t('el.select.loading');
            } else {
                if (this.filterable && this.options.length > 0 && this.filteredOptionsCount === 0) {
                    return this.noMatchText || this.$t('el.select.noMatch');
                }
                if (this.options.length === 0 || this.list.length === 0) {
                    return this.noDataText || this.$t('el.select.noData');
                }
            }
            return null;
        },

        debounce () {
            return this.remote ? 300 : 0;
        }
    },

    components: { ElSelectMenu, ElOption },

    directives: { Clickoutside },

    props: {

        /* 原有外传参数属性 */
        disabled: Boolean,
        clearable: Boolean,
        defaultFirstOption: Boolean,
        multiple: Boolean,
        name: String,
        size: String,
        loadingText: String,
        noMatchText: String,
        noDataText: String,
        popperClass: {
            type: String,
            default: 'dropselect-popper'
        },
        placeholder: {
            type: String,
            default () {
                return this.$t('el.select.placeholder');
            }
        },
        multipleLimit: {
            type: Number,
            default: 0
        },

        /* 新增外传参数属性 */

        // 搜索框 input 的 name 属性
        searchName: String,

        // 搜索框 input 的 icon 属性, 有默认设置
        searchIconClass: {
            type: String,
            default: 'search'
        },

        // 有初始化数据的需求，即需要初始化赋值的场景：
        //   若为数组，每个元素必须为对象，且对象需要有 props 所指定的 labelKey 和 valueKey （推荐方式）
        //   若为对象，需要有 props 所指定的 labelKey 和 valueKey（推荐方式）
        //   若为字符串，则为与 option 对象的 labelKey 字段相对应的值 （不推荐）
        // 无初始化数据的需求，即下拉框永远初始为空的场景：
        //   传一个空对象、数组、字符串，配合 change 事件使用，可以得到你想要的数据呦。
        value: {
            required: true
        },

        // 是否显示搜索框，进行搜索，默认开启搜索。
        filterable: {
            type: Boolean,
            default: true
        },

        // 是否启用分页器，呈现分页样式
        pageable: {
            type: Boolean,
            default: true
        },

        // 与 pageable 搭配使用，默认每页5条数据
        // 当使用滚动条模式时，如果不传入此prop，则需要在传入的 promise 中修改参数的 limit 哦。
        pageLimit: {
            type: Number,
            default: 5
        },

        // 当 value 为对象或数组时，表示 option 唯一存在字段，返回option绑定对象或数组；
        // 当 value 为字符串时，表示 option 唯一存在字段，返回option绑定对象的字段；
        // 默认为 name 字段
        valueKey: {
            type: String,
            default: 'name'
        },

        // 表示 option 绑定的 label 的字段
        // 默认为 name 字段
        labelKey: {
            type: String,
            default: 'name'
        },

        // 表示使 option 成为 disabled 的字段
        disabledKey: {
            type: String,
            default: 'disabled'
        },

        // 返回下拉列表数据的 promise 函数
        // 通过此函数，可自定义接口查询参数，可对请求到的数据特殊处理哦，用法可以参考下面两个简单的例子呦。

        // promise 函数举例1 (使用接口)：
        // function promiseFun (params) {
        // params = {...params, paId: 1234};
        // return Api.management.query(params)
        // .then(({data, total}) => { return {data: [], total: 0});
        // }

        // promise 函数举例2 (自定义)：
        // function promiseFun (params) {
        // return new Promise((resolve) => { resolve(); })
        // .then((data = [], total = 0) => { return {data, total}; });
        // }

        promise: {
            type: Function,
            required: true
        },

        // 设置请求数据的时机 （为保证数据准确性，默认为 true）
        // true 表示只在 mounted 的时候请求一次
        // false 表示每次 visible 为 true 的时候请求。
        // 若 remote 为 true，只要进行搜索操作时，都会请求数据。
        mountedQuery: {
            type: Boolean,
            default: false
        },

        // 搜索功能是否使用远程搜索， 配合 filterable 使用， 默认为 true
        // true 表示远程搜索模式
        // false 表示本地搜索模式
        remote: {
            type: Boolean,
            default: true
        },

        // 绑定值变化时，是否启用 form 校验， 默认启用
        validateEvent: {
            type: Boolean,
            default: true
        },

        // option 每项的高度, 默认为34
        itemHeight: {
            type: Number,
            default: 34
        },

        // updatedStatus 是否强制更新下拉数据
        updatedStatus: {
            type: Boolean,
            default: false
        }
    },

    provide () {
        return {
            'select': this
        };
    },

    data () {
        return {
            options: [],
            cachedOptions: [],
            selected: this.multiple ? [] : {},
            isSelect: true,
            inputLength: 20,
            inputWidth: 0,
            cachedPlaceHolder: '',
            optionsCount: 0,
            filteredOptionsCount: 0,
            visible: false,
            selectedLabel: '',
            hoverIndex: -1,
            search: '',
            optionsAllDisabled: false,
            inputHovering: false,
            currentPlaceholder: '',
            list: [], // 数组的每个元素必须为对象，且对象需要有props所指定的labelKey和valueKey
            total: 0,
            offset: 0,
            currentPage: 1,
            loading: false
        };
    },

    watch: {
        placeholder (val) {
            this.cachedPlaceHolder = this.currentPlaceholder = val;
        },

        value (val) {
            if (this.multiple) {
                this.resetInputHeight();
                this.currentPlaceholder = val.length > 0 ? '' : this.cachedPlaceHolder;
            }
            this.setSelected();
        },

        search (val) {
            if (val !== undefined) this.debouncedOnInputChange();
        },

        visible (val) {
            if (!val) {
                this.$refs.reference.$el.querySelector('input').blur();
                this.handleIconHide();
                this.broadcast('ElSelectDropdown', 'destroyPopper');
                this.search = '';
                this.selectedLabel = '';
                if (this.pageable) {
                    this.offset = 0;
                    this.currentPage = 1;
                }
                if (!this.multiple && this.selected) this.selectedLabel = this.selected.currentLabel;
                this.resetHoverIndex();
                this.managePlaceholder();
            } else {
                this.handleIconShow();
                this.getInputFocus();
                if (!this.mountedQuery) {
                    this.listQuery('', () => {
                        this.updatePopper();
                    });
                } else this.updatePopper();
                if (this.filterable && !this.multiple) {
                    if (!this.pageable) {
                        this.broadcast('ElOption', 'queryChange', '');
                        this.broadcast('ElOptionGroup', 'queryChange');
                    }
                    this.broadcast('ElInput', 'inputSelect');
                }
            }
            this.$emit('visible-change', val);
        },

        options (val) {
            if (this.$isServer) return;
            this.optionsAllDisabled = val.length === val.filter(item => item.disabled === true).length;
            if (this.multiple) {
                this.resetInputHeight();
            }
            let inputs = this.$el.querySelectorAll('input');
            if ([].indexOf.call(inputs, document.activeElement) === -1) {
                this.setSelected();
            }
            if (this.defaultFirstOption && this.filterable && this.filteredOptionsCount) {
                this.checkDefaultFirstOption();
            }
        }
    },

    methods: {
        handleIconHide () {
            let icon = this.$el.querySelector('.el-input__icon');
            if (icon) {
                removeClass(icon, 'is-reverse');
            }
        },

        handleIconShow () {
            let icon = this.$el.querySelector('.el-input__icon');
            if (icon && !hasClass(icon, 'el-icon-circle-close')) {
                addClass(icon, 'is-reverse');
            }
        },

        getInputFocus () {
            this.$nextTick(() => {
                if (this.$refs.search && this.$refs.search.$refs.input) {
                    this.$refs.search.$refs.input.focus();
                }
            });
        },

        scrollToOption (option) {
            const target = Array.isArray(option) && option[0] ? option[0].$el : option.$el;
            if (this.$refs.popper && target && !this.pageable) {
                const menu = this.$refs.popper.$el.querySelector('.el-select-dropdown__wrap');
                scrollIntoView(menu, target);
            }
        },

        handleMenuEnter () {
            this.$nextTick(() => this.scrollToOption(this.selected));
        },

        searchChange () {
            this.hoverIndex = -1;

            if (this.remote) {
                this.offset = 0;
                this.listQuery(this.search);
            } else {
                this.filteredOptionsCount = this.optionsCount;
                this.broadcast('ElOption', 'queryChange', this.search);
                this.broadcast('ElOptionGroup', 'queryChange');
            }
            if (this.defaultFirstOption && this.filterable && this.filteredOptionsCount) {
                this.checkDefaultFirstOption();
            }
        },

        listQuery (term = '', callback = noop) {
            this.loading = true;
            this.promise({ term, offset: this.offset, limit: this.pageLimit })
                .then(res => {
                    this.loading = false;
                    if (!this.isEqualArray(res.data, this.list, this.labelKey)) {
                        this.list = res.data || [];
                    }
                    if (this.total !== res.total) {
                        this.total = res.total || 0;
                    }
                    callback();
                })
                .catch(() => {
                    this.loading = false;
                    this.list = [];
                    this.total = 0;
                    callback();
                    this.updatePopper();
                });
        },

        updatePopper () {
            this.broadcast('ElSelectDropdown', 'updatePopper');
        },

        currentChange (val) {
            this.offset = (val - 1) * this.pageLimit;
            this.currentPage = val;
            if (this.remote) {
                this.listQuery(this.search);
            } else {
                this.listQuery('', () => {
                    this.$nextTick(() => {
                        this.filteredOptionsCount = this.optionsCount;
                        this.broadcast('ElOption', 'queryChange', this.search);
                        this.broadcast('ElOptionGroup', 'queryChange');
                    });
                });
            }
        },

        isObject (value) {
            return Object.prototype.toString.call(value).toLowerCase() === '[object object]';
        },

        getOption (value) {
            const isObject = this.isObject(value);

            // TODO: 采用选中及同步value方式更新selected, 以下逻辑容易导致抖动，增加额外遍历。
            /* let option;
             for (let i = this.cachedOptions.length - 1; i >= 0; i--) {
             const cachedOption = this.cachedOptions[i];
             const isEqual = isObject
             ? getValueByPath(cachedOption.value, this.valueKey) === getValueByPath(value, this.valueKey)
             : getValueByPath(cachedOption.value, this.valueKey) === value;
             if (isEqual) {
             option = cachedOption;
             break;
             }
             }
             if (option) {
             let {currentLabel, hitState, value} = option;
             return {currentLabel, hitState, value};
             } */

            const label = isObject ? value[this.labelKey] : value;
            let newOption = { value, currentLabel: label };
            if (this.multiple) newOption.hitState = false;
            return newOption;
        },

        setSelected () {
            if (!this.multiple) {
                let option = this.getOption(this.value);
                this.selectedLabel = option.currentLabel;
                this.selected = option;
            } else {
                let result = [];
                if (Array.isArray(this.value)) {
                    this.value.forEach(value => {
                        result.push(this.getOption(value));
                    });
                }
                if (!this.isEqualArray(result, this.selected, 'currentLabel')) {
                    this.selected = result;
                    this.$nextTick(() => {
                        this.resetInputHeight();
                    });
                }
            }
            this.managePlaceholder();
        },

        isEqualArray (data, eqData, key) {
            let isEqual = true;

            if (data.length !== eqData.length) return false;
            if (this.updatedStatus) return false;
            else {
                if (data.length === 0) return true;
                for (let i in data) {
                    let ind = eqData.findIndex(a => {
                        return a[key] === data[i][key];
                    });
                    if (ind === -1) {
                        isEqual = false;
                        break;
                    }
                }
            }

            return isEqual;
        },

        handleIconClick (event) {
            if (this.iconClass.indexOf('circle-close') > -1) {
                this.deleteSelected(event);
            } else {
                this.toggleMenu();
            }
        },

        handleMouseDown (event) {
            if (event.target.tagName !== 'INPUT') return;
            if (this.visible) {
                this.handleClose();
                event.preventDefault();
            }
        },

        doDestroy () {
            this.$refs.popper && this.$refs.popper.doDestroy();
            this.dropdownUl = null;
        },

        handleClose () {
            this.visible = false;
        },

        toggleLastOptionHitState (hit) {
            if (!Array.isArray(this.selected)) return;
            const option = this.selected[this.selected.length - 1];
            if (!option) return;

            if (hit === true || hit === false) {
                option.hitState = hit;
                return hit;
            }
            return option.hitState;
        },

        deletePrevTag (e) {
            if (this.multiple && e.target.value.length === 0) {
                // 若按下退格键选中最后一个tag
                if (e.keyCode === 8) {
                    this.toggleLastOptionHitState(true);
                    this.resetInputHeight();
                    return;
                }
                // 若按下delete键，如果最后一个Tag被选中，则移除
                if (e.keyCode === 46 && this.toggleLastOptionHitState()) {
                    const value = this.value.slice();
                    value.pop();
                    this.emitInputValue(value);
                    this.resetInputHeight();
                }
            }
        },

        managePlaceholder () {
            this.$nextTick(() => {
                this.currentPlaceholder = !(this.multiple
                    ? this.selected.length === 0
                    : !this.selected.currentLabel) ? '' : this.cachedPlaceHolder;
            });
        },

        resetInputHeight () {
            this.$nextTick(() => {
                if (!this.$refs.reference) return;
                let inputChildNodes = this.$refs.reference.$el.childNodes;
                let input = [].filter.call(inputChildNodes, item => item.tagName === 'INPUT')[0];
                input.style.height = Math.max(this.$refs.tags.clientHeight + 6, sizeMap[this.size] || 36) + 'px';
                if (this.visible && this.emptyText !== false) {
                    this.updatePopper();
                }
            });
        },

        resetHoverIndex () {
            setTimeout(() => {
                if (!this.multiple) {
                    this.hoverIndex = this.options.indexOf(this.selected);
                } else {
                    if (this.selected.length > 0) {
                        this.hoverIndex = Math.min.apply(null, this.selected.map(item => this.options.indexOf(item)));
                    } else {
                        this.hoverIndex = -1;
                    }
                }
            }, 300);
        },

        handleOptionSelect (option) {
            if (this.multiple) {
                const value = this.value.slice();
                const optionIndex = this.getValueIndex(value, option.value);
                if (optionIndex > -1) {
                    value.splice(optionIndex, 1);
                } else if (this.multipleLimit <= 0 || value.length < this.multipleLimit) {
                    value.push(option.value);
                }
                this.emitInputValue(value);
            } else {
                this.emitInputValue(option.value);
                this.visible = false;
            }
            this.$nextTick(() => this.scrollToOption(option));
        },

        getValueIndex (arr = [], value) {
            if (!this.isObject(value)) {
                return arr.indexOf(value);
            } else {
                const valueKey = this.valueKey;
                let index = -1;
                arr.some((item, i) => {
                    if (getValueByPath(item, valueKey) === getValueByPath(value, valueKey)) {
                        index = i;
                        return true;
                    }
                    return false;
                });
                return index;
            }
        },

        toggleMenu () {
            if (!this.disabled) {
                this.visible = !this.visible;
            }
        },

        navigateOptions (direction) {
            if (!this.visible) {
                this.visible = true;
                return;
            }
            if (this.options.length === 0 || this.filteredOptionsCount === 0) return;
            this.optionsAllDisabled = this.options.length === this.options.filter(item => item.disabled === true).length;
            if (!this.optionsAllDisabled) {
                if (direction === 'next') {
                    this.hoverIndex++;
                    if (this.hoverIndex === this.options.length) {
                        this.hoverIndex = 0;
                    }
                    if (this.options[this.hoverIndex].disabled === true ||
                        this.options[this.hoverIndex].groupDisabled === true ||
                        !this.options[this.hoverIndex].visible) {
                        this.navigateOptions('next');
                    }
                }
                if (direction === 'prev') {
                    this.hoverIndex--;
                    if (this.hoverIndex < 0) {
                        this.hoverIndex = this.options.length - 1;
                    }
                    if (this.options[this.hoverIndex].disabled === true ||
                        this.options[this.hoverIndex].groupDisabled === true ||
                        !this.options[this.hoverIndex].visible) {
                        this.navigateOptions('prev');
                    }
                }
            }
            this.$nextTick(() => this.scrollToOption(this.options[this.hoverIndex]));
        },

        selectOption () {
            if (this.options[this.hoverIndex]) {
                this.handleOptionSelect(this.options[this.hoverIndex]);
            }
        },

        deleteSelected (event) {
            event.stopPropagation();
            this.emitInputValue();
            this.visible = false;
            this.$emit('clear');
        },

        deleteTag (event, tag) {
            let index = this.selected.indexOf(tag);
            if (index > -1 && !this.disabled) {
                const value = this.value.slice();
                value.splice(index, 1);
                this.emitInputValue(value);
                this.$emit('remove-tag', tag);
            }
            event.stopPropagation();
        },

        onOptionDestroy (index) {
            if (index > -1) {
                this.optionsCount--;
                this.filteredOptionsCount--;
                this.options.splice(index, 1);
            }
        },

        resetInputWidth () {
            if (this.$refs.reference && this.$refs.reference.$el) {
                this.inputWidth = this.$refs.reference.$el.getBoundingClientRect().width;
            }
        },

        handleResize () {
            this.resetInputWidth();
            if (this.multiple) this.resetInputHeight();
        },

        checkDefaultFirstOption () {
            this.hoverIndex = -1;
            for (let i = 0; i !== this.options.length; ++i) {
                const option = this.options[i];
                if (this.search) {
                    // pick first options that passes the filter
                    if (!option.disabled && !option.groupDisabled && option.visible) {
                        this.hoverIndex = i;
                        break;
                    }
                } else {
                    // pick currently selected option
                    if (option.itemSelected) {
                        this.hoverIndex = i;
                        break;
                    }
                }
            }
        },

        getValueKey (item) {
            if (this.isObject(item.value)) return item.value;
            else return getValueByPath(item.value, this.valueKey);
        },

        emitInputValue (value) {
            let res = null;
            if (this.multiple && Array.isArray(this.value)) {
                res = value || [];
            } else if (this.isObject(this.value)) {
                res = value || {};
            } else {
                res = value[this.labelKey] || '';
            }

            this.$emit('input', res);
            if (!this.valueEquals(this.value, res)) {
                this.$emit('change', res);
                if (this.validateEvent) this.dispatch('ElFormItem', 'el.form.change', res);
            }
        },

        valueEquals (a, b) {
            if (a === b) return true;
            if (!(a instanceof Array)) return false;
            if (!(b instanceof Array)) return false;
            if (a.length !== b.length) return false;
            for (let i = 0; i !== a.length; ++i) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }
    },

    created () {
        this.cachedPlaceHolder = this.currentPlaceholder = this.placeholder;
        if (this.multiple && !Array.isArray(this.value)) {
            this.emitInputValue();
        }
        if (!this.multiple && Array.isArray(this.value)) {
            this.emitInputValue();
        }

        this.debouncedOnInputChange = debounce(this.debounce, () => {
            this.searchChange();
        });

        this.$on('handleOptionClick', this.handleOptionSelect);
        this.$on('onOptionDestroy', this.onOptionDestroy);
        this.$on('setSelected', this.setSelected);
    },

    mounted () {
        if (this.multiple && Array.isArray(this.value) && this.value.length > 0) {
            this.currentPlaceholder = '';
        }
        addResizeListener(this.$el, this.handleResize);
        if (this.multiple) {
            this.resetInputHeight();
        }
        if (this.mountedQuery) this.listQuery();
        this.$nextTick(this.resetInputWidth);
        this.setSelected();
    },

    beforeDestroy () {
        if (this.$el && this.handleResize) removeResizeListener(this.$el, this.handleResize);
    }
};
</script>

<style lang="scss">
.dropselect-popper {
    z-index: 9999 !important;

    .el-select-dropdown__item {
        list-style: none;
    }

    .el-select-dropdown__empty {
        padding: 10px 0;
        margin: 0;
        color: #999;
        font-size: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
}
</style>
