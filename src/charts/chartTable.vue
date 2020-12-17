<template>
    <div
        v-if="loading"
        :class="[loadingClasses, classes]"
    >
        <Spin
            :class="spinClasses"
            size="large"
        />
    </div>
    <div
        v-else
        :class="classes"
    >
        <h3 :class="headerClasses">
            <Button
                v-if="customColumns.length > 0"
                size="small"
                type="primary"
                @click="handleCustomColumnsClick"
            >
                自定义列
            </Button>
            <Button
                v-if="downloadAble"
                size="small"
                type="primary"
                @click="handleDownloadClick"
            >
                下载数据
            </Button>
        </h3>
        <Table
            ref="table"
            stripe
            size="small"
            :class="contentClasses"
            :columns="displayColumns"
            :data="displayData"
            :loading="loading"
            @on-sort-change="handleSortChange"
        />
        <Page
            :current="pageNum"
            :class="pageClasses"
            :page-size="pageSize"
            :page-size-opts="[10, 20, 30, 40]"
            :total="total"
            :show-elevator="showElevator"
            :show-sizer="showSizer"
            show-total
            size="small"
            @on-change="handlePageChange"
            @on-page-size-change="handlePageSizeChange"
        />
        <Modal
            v-if="customColumns.length > 0"
            v-model="showModal"
            width="800"
            title="请选择要展示的列"
            footer-hide
        >
            <Form 
                v-if="computedGroupsData.length > 0"
                :label-width="60"
            >
                <Row>
                    <FormItem 
                        v-for="(item, index) in computedGroupsData" 
                        :key="index" 
                        :label="item.name"
                    >
                        <Divider v-if="item.name === ''" dashed />
                        <div v-if="item.name !== ''" style="border-bottom: 1px solid #e9e9e9;padding-bottom:6px;margin-bottom:6px;">
                            
                            <Checkbox
                                :value="checkAll[index]"
                                @click.prevent.native="handleCheckAll(index)"
                            >
                                全选
                            </Checkbox>
                        </div>
                        <CheckboxGroup>
                            <Checkbox
                                v-for="option in item.data"
                                :key="option.key"
                                :label="option.key"
                                :value="selectedGroupColumns[index] | isChecked(option.key)"
                                @click.prevent.native="handleCustomColumnsGroupChange($event, index, option.key)"
                            >
                                {{ option.title }}
                            </Checkbox>
                        </CheckboxGroup>
                    </FormItem>
                </Row>
            </Form>
            <!-- <div
                v-else
                style="margin-left:59px"
            >
                <CheckboxGroup
                    :value="selectedCustomColumns"
                    @on-change="handleCustomColumnsChange"
                >
                    <Checkbox
                        v-for="option in customColumnsOptions"
                        :key="option.key"
                        :label="option.key"
                    >
                        {{ option.title }}
                    </Checkbox>
                </CheckboxGroup>
            </div> -->
        </Modal>
    </div>
</template>
<script>
import dataGetter from '../mixins/dataGetter';
import {classPrifix} from '../utils/const';
import {xlsDownload} from '../utils/download';
import {addCommas, isNumber, calculateTableCellWidth} from '../utils/utils';
import expandRow from './expandRow.vue';
export default {
    name: 'ChartTable',
    filters: {
        isChecked(computedSelected, key) {
            if (computedSelected) {
                return computedSelected.includes(key);
            }
            return '';
        }
    },
    mixins: [dataGetter],
    props: {
        chart: {
            type: Object,
            default() {
                return {};
            }
        }
    },
    data () {
        return {
            chartData: [],
            chartColumns: [],
            oldValues: [],
            // maxWidth: 100,
            showModal: false,
            selectedCustomColumns: [],
            selectedGroupColumns: [],
            remoteTotal: 0,
            pageSize: 10,
            pageNum: 1,
            loading: false,
            elWidth: 0,
            sort: {},
            checkAll: [],
            remotePage: {
                pageSize: 10,
                pageNum: 1
            }
        };
    },
    computed: {
        classes() {
            return [
                `${classPrifix}-chart`,
                `${classPrifix}-chart-table`
            ];
        },
        headerClasses() {
            return `${classPrifix}-chart-table-header`;
        },
        contentClasses() {
            return `${classPrifix}-chart-table-content`;
        },
        pageClasses() {
            return `${classPrifix}-chart-table-page`;
        },
        showSizer() {
            return this.chart.hideSizer === undefined ? true : !this.chart.hideSizer;
        },
        showElevator() {
            return this.chart.hideElevator === undefined ? true : !this.chart.hideElevator;
        },
        downloadAble() {
            if (this.chart.downloadAble === undefined) {
                return true;
            }
            return this.chart.downloadAble;
        },
        columns() {
            let chartColumns = this.chartColumns || [];
            let columns = this.chart.columns || [];
            return chartColumns.length > 0 ? chartColumns : columns;
        },
        data() {
            let data = this.chart.api ? this.chartData : this.chart.data;
            let sort = this.sort || {};
            if (sort.key) {
                let {key, order} = sort;
                data = data.sort((a, b) => {
                    if (order === 'desc') {
                        return b[key] - a[key];
                    }
                    else if (order === 'asc') {
                        return a[key] - b[key];
                    }
                    else {
                        return 0;
                    }
                });
            }
            return data;
        },
        total() {
            if (this.remoteTotal) {
                return this.remoteTotal;
            }
            return this.data.length;
        },
        queryParams () {
            let params = {
                ...this.remotePage
            };
            // let sort = this.sort;
            // if (sort.key) {
            //     params.sort = {
            //         [sort.key]: sort.order
            //     };
            // }
            return params;
        },
        isRemotePage() {
            return this.remoteTotal > 0;
        },
        customColumns() {
            return this.chart.customColumns || [];
        },
        // customColumnsOptions() {
        //     return this.columns.filter(item => this.customColumns.includes(item.key)) || [];
        // },
        computedGroupsData() {
            let aryData = [];
            this.customColumns.forEach((item, index) => {
                if (typeof item === 'object') {
                    aryData[index] = {
                        name: item.groupName,
                        data: []
                    };
                    this.columns.forEach(ret => {
                        if (item.columns.includes(ret.key)) {
                            aryData[index].data.push(ret);
                        }
                    });
                } else {
                    aryData[index] = {
                        name: '',
                        data: []
                    };
                    this.columns.forEach(ret => {
                        if (typeof item === 'string' && item === ret.key) {
                            aryData[index].data.push(ret);
                        }
                    });
                    
                }
            });
            return aryData;
        },
        displayData() {
            if (this.isRemotePage) {
                return this.data;
            }
            return this.data.slice((this.pageNum - 1) * this.pageSize, (this.pageNum) * this.pageSize);
        },
        headerColumnsWidth() {
            let widths = {};
            this.columns.forEach(item => {
                widths[item.key] = calculateTableCellWidth(item.title);
            });
            return widths;
        },
        columnsWidth() {
            let widths = this.headerColumnsWidth || {};
            this.displayData.forEach((item = {}) => {
                Object.keys(item).forEach(fieldName => {
                    // header中没有的不计算
                    if (widths[fieldName]) {
                        const width = calculateTableCellWidth(item[fieldName]);
                        widths[fieldName] = Math.max(widths[fieldName], width);
                    }
                });
            });
            return widths;
        },
        isExpand() {
            return this.displayData.find(item => {
                if (!Array.isArray(item.children)) {
                    return false;
                }
                return item.children.length > 0;
            });
        },
        displayColumns() {
            let selectedCustomColumns = this.selectedCustomColumns;
            let columns = this.columns.filter(
                item => selectedCustomColumns.includes(item.key)
            ).slice();
            let columnsWidth = this.columnsWidth || {};
            let expandWidth = this.isExpand ? 30 : 0;
            let totalWidth = columns.map(item => columnsWidth[item.key]).reduce(function(prev,cur){
                return prev + cur;
            },0) + expandWidth;

            let sort = this.sort || {};

            columns = columns.map(item => {
                if (item.type === 'expand') {
                    return item;
                }
                item.width = this.elWidth < totalWidth
                    ? columnsWidth[item.key]
                    : (this.elWidth / Object.keys(columnsWidth).length) < columnsWidth[item.key] ? columnsWidth[item.key] : 'auto';
                // 如果是远程排序，则需要展示排序信息
                if (sort.key && sort.key === item.key) {
                    item.sortType = sort.order || 'normal';
                }
                else {
                    item.sortType = item.sortType || 'normal';
                }
                // 如果配置文件设置了render，则不能覆盖
                // 支持通过item.renderDisabled, 设置该字段不需要转换
                !item.render && !item.renderDisabled && (item.render = (h, params) => {
                    const key = params.column.key;
                    let value = params.row[key];
                    let text = value;
                    // 如果是整数
                    if (isNumber(value)) {
                        text = addCommas(value.toString());
                    }

                    // 如果有单位
                    if (item.unit) {
                        text = text + '' + params.column.unit;
                    }

                    // 如果为null, 则显示 '-', 不加单位
                    if (value === null) {
                        text = '-';
                    }
                    return h('span', {}, text);
                });
                return item;
            });

            // 增加扩展列
            if (this.isExpand) {
                columns.unshift({
                    width: expandWidth,
                    type: 'expand',
                    render: (h, params) => {
                        return h(expandRow, {
                            props: {
                                row: params.row,
                                data: params.row.children,
                                columns: columns.slice()
                            }
                        });
                    }
                });
            }
            return columns;
        },
    },

    watch: {
        chartColumns(val) {
            if (val.length === 0) {
                return;
            }
            this.selectedCustomColumns = this.columns.filter(item => item.defaultShow !== false).map(item => item.key);
        },
        data() {
            this.pageNum = 1;
        }
    },

    mounted() {
        this.elWidth = parseInt(window.getComputedStyle(this.$el).width);
        this.selectedCustomColumns = this.columns.filter(item => item.defaultShow !== false).map(item => item.key);
        this.computedGroupsData.forEach((item, index) => {
            this.selectedGroupColumns[index] = [];
            this.oldValues[index] = [];
            item.data.forEach(ret => {
                if (ret.defaultShow !== false) {
                    this.selectedGroupColumns[index].push(ret.key);
                }
                this.oldValues[index].push(ret.key);
            });
        });
        this.oldValues.forEach((item, index) => {
            if (item.length === this.selectedGroupColumns[index].length) {
                this.checkAll[index] = true;
            }
        });
        this.$watch('chart', () => {
            this.$nextTick(() => {
                this.chartData = [];
                this.chartColumns = [];
                this.remoteTotal = 0;
            });
        });
    },
    methods: {
        getDataFinished() {},
        handleCustomColumnsClick() {
            this.showModal = true;
        },
        handlePageChange(pageNum) {
            this.pageNum = pageNum;
            if (this.isRemotePage) {
                this.remotePage = {
                    ...this.remotePage,
                    pageNum
                };
            }
        },
        handlePageSizeChange(pageSize) {
            this.pageSize = pageSize;
            if (this.isRemotePage) {
                this.page = {
                    ...this.page,
                    pageSize
                };
            }
        },
        handleDownloadClick() {
            if (this.chart.downLoadApi) {
                window.open(this.chart.downLoadApi);
            }
            else {
                // download local data
                const header = this.columns.map(item => item.title);
                const data = [
                    header,
                    ...this.data.map(item => {
                        return this.columns.map(field => item[field.key]);
                    })
                ];
                xlsDownload(data, this.chart.label);
            }
        },
        handleSortChange({key, order}) {
            this.sort = {
                key,
                order
            };
        },

        handleCustomColumnsChange(val) {
            this.selectedCustomColumns = val;
        },

        handleCheckAll (index) {
            this.handleExtract(index);
        },

        handleExtract(index) {
            this.computedGroupsData.forEach((inx) => {
                this.selectedGroupColumns[index] = [];
                this.checkAll[inx] = false;
            });
            this.checkAll[index] = !this.checkAll[index];
            if (this.checkAll[index]) {
                this.computedGroupsData[index].data.map(ret => {
                    return this.selectedGroupColumns[index].push(ret.key);
                });
            } else {
                this.selectedGroupColumns[index] = [];
            }
            this.selectedCustomColumns = this.selectedGroupColumns.flat(Infinity);

        },
        
        handleCustomColumnsGroupChange(ev, index, key) {
            if (!this.selectedGroupColumns[index]) {
                this.selectedGroupColumns[index] = [];
            }
            if (key && !this.selectedGroupColumns[index].includes(key)) {
                this.selectedGroupColumns[index].push(key);
            } else {
                this.selectedGroupColumns[index] = this.selectedGroupColumns[index].filter(i => i !== key);
            }
            if (this.selectedGroupColumns[index].length === this.oldValues[index].length) {
                this.checkAll[index] = true;
            } else {
                this.checkAll[index] = false;
            }
            this.selectedCustomColumns = this.selectedGroupColumns.flat(Infinity);
        }
    }
};
</script>
