// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
const config = require('./package.json');
const {ipcRenderer, remote} = require('electron');
const {Menu, MenuItem, dialog} = remote;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const md5 = str => {
    return crypto.createHash('md5').update(str, 'utf8').digest('hex')
};

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    list: [],
    listIndex: -1,
    taskIndex: -1,
  },
  getters: {
    listCount(state) {
      return state.list.length;
    },
    listItem(state) {
      const {list, listIndex} = state;
      return list[listIndex];
    },
    name(state, getters) {
      const {listItem: {name} = {}} = getters;
      return name;
    },
    taskList(state, getters) {
      const {listItem: {taskList = []} = {}} = getters;
      return taskList;
    },
    taskCount(state, getters) {
      return getters.taskList.length;
    },
    task(state, getters) {
      const {taskList = []} = getters;
      const {taskIndex} = state;
      return taskList[taskIndex];
    },
    title(state, getters) {
      const {task: {title} = {}} = getters;
      return title;
    },
    content(state, getters) {
      const {task: {content} = {}} = getters;
      return content;
    },
    status(state, getters) {
      const {task: {status} = {}} = getters;
      return status;
    },
    timestamp(state, getters) {
      const {task: {timestamp} = {}} = getters;
      return timestamp;
    },
  },
  mutations: {
    addListItem(state) {
      const item = {
        name: 'Untitled list', // TODO: untitled list indexed default name
        taskList: [],
      };
      state.list.push(item);
    },
    setListIndex(state, index) {
      state.listIndex = index;
    },
    removeListItem(state, index) {
      const {list} = state;
      list.splice(index, 1);
      state.list = list;
    },
    setListItemName(state, name) {
      const {list, listIndex} = state;
      const listItem = list[listIndex];
      listItem.name = name;
      list[listIndex] = listItem;
      state.list = list;
    },
    addTask(state, {listIndex, task}) {
      const {list} = state;
      const listItem = list[listIndex];
      const {taskList} = listItem;
      const updatedListItem = Object.assign({}, listItem, {
        taskList: [...taskList, task],
      });
      list.splice(listIndex, 1, updatedListItem);
      state.list = list;
    },
    setTaskIndex(state, index) {
      state.taskIndex = index;
    },
    setTaskTitle(state, title) {
      const {list, listIndex, taskIndex} = state;
      const {taskList} = list[listIndex];
      taskList[taskIndex].title = title;
      list[listIndex].taskList = taskList;
      state.list = list;
    },
    setTaskContent(state, content) {
      const {list, listIndex, taskIndex} = state;
      const {taskList} = list[listIndex];
      taskList[taskIndex].content = '';
      taskList[taskIndex].content = content;
      list[listIndex].taskList = taskList;
      state.list = list;
    },
    setTaskStatus(state, {index, status}) {
      const {list, listIndex} = state;
      const {taskList} = list[listIndex];
      taskList[index].status = status;
      list[listIndex].taskList = taskList;
      state.list = list;
    },
  },
  actions: {
    setListIndex({commit, dispatch}, index) {
      commit('setListIndex', index);
      dispatch('resetTaskIndex');
    },
    setListItemName({commit}, name) {
      commit('setListItemName', name);
    },
    async addListItem({commit, getters, dispatch}) {
      await commit('addListItem');
      dispatch('setListIndex', getters.listCount - 1);
    },
    removeListItem({commit, state, getters, dispatch}, index) {
      const {listIndex} = state;
      const {listCount} = getters;
      let newListIndex = listIndex;
      if (listIndex > index) {
        // -1
        newListIndex -= 1;
      }
      if (listIndex === index) {
        // -1
        newListIndex -= 1;
        // newListIndex === -1 && listCount > 1  ==>  +1
        if (newListIndex === -1 && listCount > 1) {
          newListIndex += 1;
        }
      }
      commit('removeListItem', index);
      dispatch('setListIndex', newListIndex);
    },
    setTaskIndex({commit}, index) {
      commit('setTaskIndex', index);
    },
    resetTaskIndex({dispatch}) {
      dispatch('setTaskIndex', -1);
    },
    setTaskName({commit}, title) {
      commit('setTaskTitle', title);
    },
    setTaskContent({commit}, content) {
      commit('setTaskContent', content);
    },
    setTaskStatus({commit}, {index, status}) {
      commit('setTaskStatus', {index, status});
    },
    async addTask({commit, state, getters, dispatch}, task) {
      const {listCount} = getters;
      // add list item if list is empty.
      if (!listCount) {
        await dispatch('addListItem');
      }
      const {listIndex} = state;
      commit('addTask', {listIndex, task});
      dispatch('resetTaskIndex');
    },
    removeTask({state, dispatch}, {listIndex, taskIndex}) {
      const {list} = state;
      const listItem = list[listIndex];
      const taskList = listItem.taskList;
      taskList.splice(taskIndex, 1);
      listItem.taskList = taskList;
      list.splice(listIndex, 1, listItem);
      state.list = list;
      dispatch('resetTaskIndex');
    },
  },
});

const {mapState, mapGetters, mapActions} = Vuex;

const STATUS = {
  UNCHECK: 0,
  CHECKED: 1,
};

let timemer = null;
let timestamp = new Date().getTime();

const isKey = (name, keyCode) => {
  const keyCodes = {
    ESC: 27,
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    u: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,
    F1: 112,
  };
  return keyCode === keyCodes[name.toUpperCase()];
};

const selectText = (el) => {
  try {
    if (document.selection) {
      const range = document.body.createTextRange();
      range.moveToElementText(el);
      range.select();
    } else if (window.getSelection) {
      const range = document.createRange();
      range.selectNodeContents(el);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    } else {
      //
    }
  } catch (e) {
    console.log(e);
  }
};

const throttle = (fn, wait = 250) => {
  let inThrottle, lastFn, lastTime;
  return function () {
    const context = this,
      args = arguments;
    if (!inThrottle) {
      fn.apply(context, args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(function () {
        if (Date.now() - lastTime >= wait) {
          fn.apply(context, args);
          lastTime = Date.now();
        }
      }, Math.max(wait - (Date.now() - lastTime), 0));
    }
  };
};

const themes = [
  {label: 'theme_687ccc', class: 'theme_687ccc'},
  {label: 'theme_ac6bad', class: 'theme_ac6bad'},
  {label: 'theme_cc5676', class: 'theme_cc5676'},
  {label: 'theme_d05a56', class: 'theme_d05a56'},
  {label: 'theme_389069', class: 'theme_389069'},
  {label: 'theme_358f89', class: 'theme_358f89'},
  {label: 'theme_73818c', class: 'theme_73818c'},
  {label: 'theme_dfedf9', class: 'theme_dfedf9'},
  {label: 'theme_f2e7f9', class: 'theme_f2e7f9'},
];

new Vue({
  el: '#app',
  store,
  data: {
    appTitle: config.title,
    version: config.version,
    checkList: [],
    sidebarVisible: false,
    detailVisible: false,
    windowIsAlwaysOnTop: false,
    windowMaxed: false,
    isIos: false,
    currentFile: null,
    notice: null,
    noticeUnfold: false,
    searchPanelVisible: false,
    searchList: [],
    searchStr: '',
    backup: {},
    sidebarAnimate: false,
    initialAbstract: null,
    mainActionPopupVisible: false,
    doneTasksVisible: true,
    themes: themes,
    theme: themes[0],
  },
  computed: {
    ...mapState({
      'list': state => state.list,
      'listIndex': state => state.listIndex,
      'taskIndex': state => state.taskIndex,
    }),
    ...mapGetters({
      'name': 'name',
      'taskList': 'taskList',
      'taskTitle': 'title',
      'taskContent': 'content',
      'taskStatus': 'status',
      'taskTimestamp': 'timestamp',
    }),
    fileName() {
      const {currentFile} = this;
      if (currentFile) {
        return path.basename(currentFile);
      }
      return undefined;
    },
    headTitle() {
      const {fileName, appTitle} = this;
      const fileNameString = fileName ? `${fileName} - ` : '';
      return `${fileNameString}${appTitle}`;
    },
    maskVisible() {
      const {sidebarVisible, detailVisible} = this;
      return sidebarVisible || (detailVisible);
    },
    ctrlOrCmd() {
      return this.isIos ? 'Cmd' : 'Ctrl';
    },
  },
  filters: {
    time(t) {
      const time = new Date(t);
      const year = time.getFullYear();
      const month = time.getMonth() + 1;
      const date = time.getDate();
      const hour = time.getHours();
      const minute = time.getMinutes();
      return `${year}-${month}-${date} ${hour}:${minute}`;
    },
  },
  watch: {
    list: {
      deep: true,
      handler() {
        if (this.searchPanelVisible) {
          this.search();
        }
      }
    },
    searchStr() {
      const throttleSearch = throttle(this.search);
      throttleSearch();
    },
    notice(notice) {
      if (notice) {
        clearTimeout(timemer);
        timemer = setTimeout(() => {
          clearTimeout(timemer);
          timemer = null;
          this.notice = null;
        }, 5000);
      }
    },
  },
  created() {
    ipcRenderer.on('isIos', (event, bool) => {
      this.isIos = bool;
    });
    ipcRenderer.on('ask-change-sate-before-quit', (event) => {
      console.log('ipcRenderer on ask-change-sate-before-quit', this.initialAbstract !== md5(JSON.stringify(store.state)));
      ipcRenderer.send('set-need-save-state', this.initialAbstract !== md5(JSON.stringify(store.state)));
    });
    ipcRenderer.on('save', (event, bool) => {
      if (bool) {
        this.save().then(() => {
          ipcRenderer.send('close-window-after-save');
        });
      }
    });
    ipcRenderer.on('save-load', (event, bool) => {
      if (bool) {
        this.save().then(() => {
          this.loadFile();
        });
      }
    });
    ipcRenderer.on('load-file', (event, bool) => {
      if (bool) {
        this.loadFile();
      }
    });
    const data = ipcRenderer.sendSync('get-file-data');
    if (data ===  null || data === '.') {
      this.newFile();
    } else {
      try {
        this.readFile(data);
      } catch(e) {
        console.log(e);
      }
    }
  },
  mounted() {
    this.registerShortcuts();
    window.addEventListener('resize', this.windowResizeHandler);
    this.$nextTick(() => {
      if(document.createEvent) {
        var event = document.createEvent("HTMLEvents");
        event.initEvent("resize", true, true);
        window.dispatchEvent(event);
      } else if(document.createEventObject) {
          window.fireEvent("onresize");
      }
    });
  },
  destroyed() {
    this.unregisterShortcuts();
    window.removeEventListener('resize', this.windowResizeHandler);
  },
  methods: {
    ...mapActions({
      'addListItem': 'addListItem',
      'addTask': 'addTask',
      'setListIndex': 'setListIndex',
      'setTaskIndex': 'setTaskIndex',
      'removeListItem': 'removeListItem',
      'removeTask': 'removeTask',
      'setListItemName': 'setListItemName',
      'setTaskName': 'setTaskName',
      'setTaskContent': 'setTaskContent',
      'setTaskStatus': 'setTaskStatus',
    }),
    windowResizeHandler(ev) {
      throttle((ev) => {
        const width = ev.target.visualViewport.width;
        const smallWindow = width <= 600;
        this.sidebarAnimate = smallWindow;
        if (!smallWindow && this.sidebarVisible) {
          this.toggleSidebar();
        }
      })(ev);
    },
    shortcutHandler(ev) {
      const {keyCode, ctrlKey, metaKey, shiftKey} = ev;
      const {isIos, newFile, save, load, addListItem, detailVisible, hideDetail, sidebarVisible, toggleSidebar, searchPanelVisible, onListWrapperClick, showSearchPanel, hideSearchPanel, showReadMe} = this;
      const ctrl = isIos ? metaKey : ctrlKey;
      const shift = shiftKey;
      if (ctrl) {
        isKey('N', keyCode) && newFile();
        isKey('S', keyCode) && save();
        shift && isKey('S', keyCode) && saveAs();
        isKey('O', keyCode) && load();
        isKey('L', keyCode) && addListItem();
        isKey('T', keyCode) && onListWrapperClick();
        isKey('F', keyCode) && showSearchPanel();
      }
      if (isKey('F1', keyCode)) {
        showReadMe();
      }
      if (isKey('ESC', keyCode)) {
        if (detailVisible) {
          hideDetail();
        } else if (sidebarVisible) {
          toggleSidebar();
        } else if (searchPanelVisible) {
          hideSearchPanel();
        } else {
          //
        }
      }
    },
    registerShortcuts() {
      document.addEventListener('keydown', this.shortcutHandler, false);
    },
    unregisterShortcuts() {
      document.removeEventListener('keydown', this.shortcutHandler, false);
    },
    closeWindow() {
      ipcRenderer.send('close-window');
    },
    maximizeWindow() {
      this.windowMaxed = ipcRenderer.sendSync('maximize-window');
    },
    minimizeWindow() {
      ipcRenderer.send('minimize-window');
    },
    topenWindow() {
      this.windowIsAlwaysOnTop = ipcRenderer.sendSync('topen-widnow');
    },
    newFile() {
      const defaultStore = {
        "list": [],
        "listIndex": -1,
        "taskIndex": -1
      };
      store.replaceState(defaultStore);
      this.initialAbstract = md5(JSON.stringify(defaultStore));
    },
    save() {
      return new Promise((resolve, reject) => {
        const data = JSON.stringify(store.state);
        const {currentFile, saveFile, saveAs} = this;
        if (currentFile) {
          saveFile(currentFile, data).then((res) => {
            resolve(res);
          }).catch((err) => {
            reject(err);
          });
        } else {
          saveAs().then((res) => {
            resolve(res);
          }).catch((err) => {
            reject(err);
          });
        }
      });
    },
    saveAs() {
      return new Promise((resolve, reject) => {
        const data = JSON.stringify(store.state);
        const {saveFile} = this;
        try {
          ipcRenderer.on('save-dialog-result', (event, file) => {
            if (file) {
              saveFile(file, data).then((res) => {
                resolve(res);
              }).catch((e) => {
                reject(e);
              });
            }
          });
          ipcRenderer.send('show-save-dialog');
        } catch (e) {
          console.log(e);
          reject({
            type: 'error',
            title: '保存失败!',
            desc: e.toString(),
          });
        }
      });
    },
    load() {
      ipcRenderer.send('load-file');
    },
    loadFile() {
      try {
        ipcRenderer.on('open-dialog-result', (event, files) => {
          if (files && files.length) {
            const [file] = files;
            this.readFile(file).then((res) => {
              this.$nextTick(() => {
                this.notice = Object.assign({}, res);
              });
            }).catch((e) => {
              this.$nextTick(() => {
                this.notice = Object.assign({}, e);
              });
            });
          } else {
            // user canceled
            console.log('open file canceled.');
          }
        });
        ipcRenderer.send('show-open-dialog');
      } catch (e) {
        console.log(e);
        this.notice = Object.assign({}, {
          type: 'error',
          title: '文件载入出错!',
          desc: e.toString(),
        });
      }
    },
    readFile(file) {
      return new Promise((resolve, reject) => {
        const rs = fs.createReadStream(file);
        let err = 0;
        rs.on('readable', () => {
          const read = rs.read();
          if (read) {
            try {
              const data = JSON.parse(read.toString());
              store.replaceState(data);
            } catch(e) {
              err++;
              console.log('[read error]', e);
            }
          }
        });
        rs.on('end', (err) => {
          if (err) {
            return reject({
              type: 'error',
              title: '文件载入失败!',
              desc: `文件格式错误，共${err}处错误。`,
            });
          }
          this.currentFile = file;
          this.initialAbstract = md5(JSON.stringify(store.state));
          resolve({
            type: 'success',
            title: '文件载入完成!',
            desc: '',
          });
        });
      });
    },
    saveFile(file, data) {
      return new Promise((resolve, reject) => {
        try {
          fs.writeFile(file, data, (err) => {
            if (err) {
              console.log(err);
              return reject({
                type: 'error',
                title: '文件保存失败!',
                desc: err.toString(),
              });
            }
            this.initialAbstract = md5(JSON.stringify(store.state));
            resolve({
              type: 'success',
              title: '文件保存成功!',
              desc: '',
            });
          });
        } catch (e) {
          console.log(e);
          reject({
            type: 'error',
            title: '文件保存失败!',
            desc: e.toString(),
          });
        }
      });
    },
    onListItemClick(index) {
      this.setListIndex(index);
    },
    onListItemDblclick({target}) {
      this.onListItemTitleDblclick({target: target.querySelector('.sidebar-block-title')});
    },
    onListItemTitleDblclick({target}) {
      if (target) {
        target.setAttribute('contenteditable', true);
        target.focus();
        this.$nextTick(() => {
          selectText(target);
        });
      }
    },
    onMainListItemTitleClick({target}) {
      if (target) {
        this.$nextTick(() => {
          selectText(target);
        });
      }
    },
    onListItemContextmenu(ev, index) {
      ev.preventDefault();
      const menu = new Menu();
      menu.append(new MenuItem({
        label: 'Rename list',
        click: () => {
          this.onListItemTitleDblclick({target: ev.target.parentNode.querySelector('.sidebar-block-title')});
        },
      }));
      menu.append(new MenuItem({type: 'separator'}));
      menu.append(new MenuItem({
        label: 'Delete list',
        click: () => {
          this.onListItemClickRemove(index);
        },
      }));
      menu.popup({window: remote.getCurrentWindow()});
    },
    onListItemClickRemove(index) {
      const {list, removeListItem} = this;
      const listName = list[index].name;
      const answer = dialog.showMessageBox(remote.getCurrentWindow(), {
        type: 'none',
        title: 'Deleta list',
        message: `"${listName}" will be permanently deleted.`,
        buttons: ['Delete', 'Cancel'],
        noLink: true,
      });
      if (answer === 0) {
        removeListItem(index);
      }
    },
    toggleSidebar() {
      this.sidebarVisible = !this.sidebarVisible;
    },
    onListWrapperClick() {
      this.$refs.inp.focus();
    },
    onMaskClick() {
      this.sidebarVisible = false;
      this.detailVisible = false;
    },
    hideDetail() {
      this.detailVisible = false;
    },
    onTaskClick(listIndex, taskIndex) {
      this.setListIndex(listIndex);
      this.setTaskIndex(taskIndex);
      this.detailVisible = true;
    },
    onTaskContextmenu(ev, listIndex, taskIndex) {
      ev.preventDefault();
      const menu = new Menu();
      menu.append(new MenuItem({
        label: 'Delete task',
        click: () => {
          this.onTaskClickRemove(listIndex, taskIndex);
        },
      }));
      menu.popup({window: remote.getCurrentWindow()});
    },
    onTaskClickRemove(listIndex, taskIndex) {
      const {list, removeTask, detailVisible, hideDetail} = this;
      const taskTitle = list[listIndex].taskList[taskIndex].title;
      const answer = dialog.showMessageBox(remote.getCurrentWindow(), {
        type: 'none',
        title: 'Deleta task',
        message: `"${taskTitle}" will be permanently deleted.`,
        buttons: ['Delete', 'Cancel'],
        noLink: true,
      });
      if (answer === 0) {
        removeTask({listIndex, taskIndex});
        detailVisible && hideDetail();
      }
    },
    onTaskInpSubmit() {
      const {$refs, addTask} = this;
      const title = $refs.inp.value.trim();
      if (title) {
        const task = {
          title,
          content: '',
          status: STATUS.UNCHECK,
          timestamp: new Date().getTime(),
        };
        addTask(task).then(() => {
          $refs.inp.value = '';
        });
      }
    },
    onListItemTitleSubmit({target}, enable=false) {
      if (target) {
        this.setListItemName(target.textContent);
        if (enable) {
          target.setAttribute('contenteditable', false);
        }
        this.$nextTick(() => {
          target.scrollTo(0, 0);
        });
      }
    },
    onTaskTitleSubmit({target}) {
      if (target) {
        this.setTaskName(target.textContent);
      }
    },
    onTaskContentSubmit({target}) {
      if (target) {
        this.setTaskContent(target.innerHTML);
      }
    },
    toggleNotice() {
      if (this.notice) {
        this.notice = null;
      } else {
        this.notice = Object.assign({}, {
          type: 'error',
          title: 'Show Notice Tip',
          desc: 'You clicked notict tip test btn.'
        });
      }
    },
    toggleNoticeFold() {
      this.noticeUnfold = !this.noticeUnfold;
    },
    showSearchPanel() {
      this.searchPanelVisible = true;
      const {backup, listIndex, sidebarVisible, toggleSidebar, $refs} = this;
      this.backup = Object.assign({}, backup, {
        listIndex,
      });
      if (sidebarVisible) {
        toggleSidebar();
      }
      this.searchStr = '';
      this.$nextTick(() => {
        $refs.searchInp.focus();
      });
    },
    hideSearchPanel() {
      this.searchPanelVisible = false;
      const {backup = {}, setListIndex} = this;
      const {listIndex} = backup;
      if (listIndex !== null || listIndex !== undefined) {
        setListIndex(listIndex);
        this.backup = Object.assign({}, backup, {
          listIndex: null,
        });
      }
      this.searchStr = '';
    },
    search() {
      const {searchStr, list} = this;
      if (searchStr.trim()) {
        const reg = new RegExp(searchStr, 'gim');
        const searchList = [];
        list.map((item, index) => {
          const {name, taskList} = item;
          const nameFit = reg.test(name);
            taskList.map((task, ind) => {
              const {title, content} = task;
              const titleFit = reg.test(title);
              const contentFit = reg.test(content);
              if (nameFit || titleFit || contentFit) {
                searchList.push({
                  itemIndex: index,
                  taskIndex: ind,
                  task,
                  name,
                });
              }
            });
        });
        this.searchList = [...searchList];
      } else {
        this.searchList = [];
      }
    },
    showReadMe() {
      ipcRenderer.send('show-read-me');
    },
    toggleDoneTasks(visible) {
      this.doneTasksVisible = visible;
    },
    setTheme(theme) {
      console.log('theme', theme);
      this.theme = theme;
    },
  },
});