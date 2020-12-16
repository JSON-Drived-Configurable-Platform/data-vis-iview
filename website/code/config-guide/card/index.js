// simple
const simple = {};
const simpleCharts = [
    {
        'type':'card',
        'label': '年活跃',
        'data': [
            {
                'label': '今日曝光',
                'value': 22246150
            },
            {
                'label': '今日点击',
                'value': 22246150
            }
        ],
    }
];


simple.data = {
    charts: simpleCharts
};


simple.code = `
const charts = ${JSON.stringify(simpleCharts, null, 4)};

<template>
    <DataVisGroup
        :charts='charts'
    />
</template>
<script>
export default {
    data() {
        return {
            charts
        };
    }
};
</script>
`;


export default {
    simple,
};
