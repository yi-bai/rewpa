export default class OnChangeResultPath {
  constructor(element){
    this.list = [element];
  }

  unshift(bool){
    this.list.unshift(bool);
    return this;
  }
}