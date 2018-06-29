<template>
    <dropselect v-model="status"
                placeholder="请选择一个状态"
                class="dropselect"
                :remote="false"
                :promise="statusPromise">
        <el-option label="全部"
                   :value="totalItem"></el-option>
    </dropselect>
</template>

<script>
export default {
    data () {
        return {
            status: {
                id: 'pending',
                name: '未启动'
            },
            totalItem: {
                id: 'total',
                name: '全部'
            }
        };
    },
    methods: {
        statusPromise (params) {
            // mock api http response 
            const arrays = [
                { id: 'new', name: '新建' },
                { id: 'pending', name: '未启动' },
                { id: 'running', name: '运行中' },
                { id: 'paused', name: '已暂停' },
                { id: 'complete', name: '已完成' }
            ];
            return Promise.resolve(arrays).then(data => {
                return {
                    data: data,
                    total: data.length
                };
            });
        }
    }
}
</script>
