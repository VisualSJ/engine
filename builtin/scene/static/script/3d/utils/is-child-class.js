module.exports = (subClass, ...superClasses) => {
    return superClasses.some((superClass) => cc.js.isChildClassOf(subClass, superClass));
};
