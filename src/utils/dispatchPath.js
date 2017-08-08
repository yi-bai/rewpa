import _ from 'lodash';

export default (dispatch) => {
	const ret = (...args) => dispatch(...args);
	ret.to = (path) => (arg) => dispatch(_.assign(arg, { path }));
	return ret;
}