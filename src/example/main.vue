<template>
    <dropselect v-model="status"
                placeholder="请选择一个状态"
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
            const { limit, offset } = params;
            // mock api http response 
            return new Promise.resolve().then(() => {
                const arrays = [
                    { id: 'new', name: '新建' },
                    { id: 'pending', name: '未启动' },
                    { id: 'running', name: '运行中' },
                    { id: 'paused', name: '已暂停' },
                    { id: 'complete', name: '已完成' }
                ];
                return {
                    data: arrays.slice(offset, limit + offset),
                    total: arrays.length
                };
            });
        }
    }
}
</script>
