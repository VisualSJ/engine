const MathUtils = {

    /**
     * 取给定边界范围的值
     * @param {number} val
     * @param {number} min
     * @param {number} max
     */
    clamp(val, min, max) {
        return Math.min.call(null, Math.max.call(null, val, min), max);
    },

    /**
     * 加法函数
     * 入参：函数内部转化时会先转字符串再转数值，因而传入字符串或number均可
     * 返回值：arg1加上arg2的精确结果
     * @param {Number | String} arg1
     * @param {Number | String} arg2
     */
    add(arg1, arg2) {
        let { maxPow , num1, num2} = this._computMaxPow(arg1, arg2);
        return (num1 + num2) / maxPow;
    },

    /**
     * 减法函数
     * 入参：函数内部转化时会先转字符串再转数值，因而传入字符串或number均可
     * 返回值：arg1 减 arg2的精确结果
     * @param {Number | String} arg1
     * @param {Number | String} arg2
     */
    sub(arg1, arg2) {
        let {maxPow, num1, num2} = this._computMaxPow(arg1, arg2);
        return ((num1 - num2) / maxPow).toFixed(maxPreci);
    },

    /**
     * 乘法函数
     * 返回值：arg1 减 arg2的精确结果
     * @param {Number | String} arg1
     * @param {Number | String} arg2
     */
    mul(arg1, arg2) {
        let {maxPow, num1, num2} = this._computMaxPow(arg1, arg2);
        return num1 * num2 / (maxPow * maxPow);
    },

    /**
     * 除法
     * 返回值：arg1 除于 arg2的精确结果
     * @param {Number | String} arg1
     * @param {Number | String} arg2
     */
    div(arg1, arg2) {
        let {maxPow, num1, num2} = this._computMaxPow(arg1, arg2);
        return ((num1 / num2) / maxPow).toFixed(maxPreci);
    },

    /**
     * 计算两个数值小数点位数的最大位数与10的乘积,与最大精度
     * 入参：函数内部转化时会先转字符串再转数值，因而传入字符串或number均可
     * 返回值：
     * @param {Number | String} arg1
     * @param {Number | String} arg2
     */
    _computMaxPow(arg1, arg2) {
        let r1; let r2; let maxPreci;
        let num1 = Number(arg1);
        let num2 = Number(arg2);
        r1 = this._comPreci(arg1);
        r2 = this._comPreci(arg2);
        maxPreci = Math.max(r1, r2);
        let maxPow = Math.pow(10, maxPreci);
        if (maxPreci > 20) {
            maxPreci = 20;
        }
        if (r1 === 0 && maxPreci > 0) {
            num1 = num1 * maxPow;
        } else {
            num1 = Number(arg1.toString().replace('.', ''));
        }

        if (r2 === 0 && maxPreci > 0) {
            num2 = num2 * maxPow;
        } else {
            num2 = Number(arg2.toString().replace('.', ''));
        }
        return {
            maxPow,
            maxPreci,
            num1,
            num2,
        };
    },

    /**
     * 计算数值的精度（小数点位数）
     * 返回值：该数值的小数点位数
     * @param {Number || String} value
     */
    _comPreci(value) {
        let rang;
        try {
            rang = value.toString().split('.')[1].length;
        } catch (error) {
            rang = 0;
        }
        return rang;
    },
};

module.exports = MathUtils;
