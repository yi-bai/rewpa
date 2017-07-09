export default class RewpaResultList {
  constructor(element){
    this.list = [element];
  }

  unshift(bool){
    this.list.unshift(bool);
    return this;
  }
}