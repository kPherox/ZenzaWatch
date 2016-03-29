var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};

// シークバーのサムネイル関連
// 動ける間になんとか作り上げよう
//===BEGIN===

/*
// マスコットキャラクターのサムネーヨちゃん サムネイルがない時にあらわれる
　 ∧  ∧　  　┌────────────
　( ´ー｀)　 ＜　サムネーヨ
 　＼　< 　　　└───/|────────
　　　＼.＼＿＿＿＿__／/
　　　　 ＼　　　　　／
　　　　　 ∪∪￣∪∪
*/



  var StoryBoardModel = function() { this.initialize.apply(this, arguments); };
  _.extend(StoryBoardModel.prototype, AsyncEmitter.prototype);

  _.assign(StoryBoardModel.prototype,{
      initialize: function(params) {
        this._isAvailable = false;
      },
      _createBlankData: function(info) {
        _.assign(info, {
          duration: 1,
          url: '',
          storyBoard: [{
            id: 1,
            url: '',
            thumbnail: {
              width: 1,
              height: 1,
              number: 1,
              interval: 1
            },
            board: {
              rows: 1,
              cols: 1,
              number: 1
            }
          }]
        });
        return info;
      },

      update: function(info) {
        if (!info || info.status !== 'ok') {
          this._info = this._createBlankData();
          this._isAvailable = false;
        } else {
          this._info = info;
          this._isAvailable = true;
        }

        this.emitAsync('update');
      },

      reset: function() {
        this._isAvailable = false;
        this.emitAsync('reset');
      },

      unload: function() {
        this._isAvailable = false;
        this.emitAsync('unload');
      },

      isAvailable: function() {
        return !!this._isAvailable;
      },

      hasSubStoryBoard: function() {
        return this._info.storyBoard.length > 1;
      },

      getStatus:   function() { return this._info.status; },
      getMessage:  function() { return this._info.message; },
      getDuration: function() { return parseInt(this._info.duration, 10); },

      getUrl: function(i) { return this._info.storyBoard[i || 0].url; },
      getWidth:
        function(i) { return parseInt(this._info.storyBoard[i || 0].thumbnail.width, 10); },
      getHeight:
        function(i) { return parseInt(this._info.storyBoard[i || 0].thumbnail.height, 10); },
      getInterval:
        function(i) { return parseInt(this._info.storyBoard[i || 0].thumbnail.interval, 10); },
      getCount: function(i) {
        return Math.max(
          Math.ceil(this.getDuration() / Math.max(0.01, this.getInterval())),
          parseInt(this._info.storyBoard[i || 0].thumbnail.number, 10)
        );
      },
      getRows: function(i) { return parseInt(this._info.storyBoard[i || 0].board.rows, 10); },
      getCols: function(i) { return parseInt(this._info.storyBoard[i || 0].board.cols, 10); },
      getPageCount: function(i) { return parseInt(this._info.storyBoard[i || 0].board.number, 10); },
      getTotalRows: function(i) {
        return Math.ceil(this.getCount(i) / this.getCols(i));
      },

      getPageWidth:    function(i) { return this.getWidth(i)  * this.getCols(i); },
      getPageHeight:   function(i) { return this.getHeight(i) * this.getRows(i); },
      getCountPerPage: function(i) { return this.getRows(i)   * this.getCols(i); },

      /**
       *  nページ目のURLを返す。 ゼロオリジン
       */
      getPageUrl: function(page, storyBoardIndex) {
        page = Math.max(0, Math.min(this.getPageCount(storyBoardIndex) - 1, page));
        return this.getUrl(storyBoardIndex) + '&board=' + (page + 1);
      },

      /**
       * msに相当するサムネは何番目か？を返す
       */
      getIndex: function(ms, storyBoardIndex) {
        // msec -> sec
        var v = Math.floor(ms / 1000);
        v = Math.max(0, Math.min(this.getDuration(), v));

        // サムネの総数 ÷ 秒数
        // Math.maxはゼロ除算対策
        var n = this.getCount(storyBoardIndex) / Math.max(1, this.getDuration());

        return parseInt(Math.floor(v * n), 10);
      },

      /**
       * Indexのサムネイルは何番目のページにあるか？を返す
       */
      getPageIndex: function(thumbnailIndex, storyBoardIndex) {
        var perPage   = this.getCountPerPage(storyBoardIndex);
        var pageIndex = parseInt(thumbnailIndex / perPage, 10);
        return Math.max(0, Math.min(this.getPageCount(storyBoardIndex), pageIndex));
      },

      /**
       *  msに相当するサムネは何ページの何番目にあるか？を返す
       */
      getThumbnailPosition: function(ms, storyBoardIndex) {
        var thumbnailIndex = this.getIndex(ms, storyBoardIndex);
        var pageIndex      = this.getPageIndex(thumbnailIndex);

        var mod = thumbnailIndex % this.getCountPerPage(storyBoardIndex);
        var row = Math.floor(mod / Math.max(1, this.getCols()));
        var col = mod % this.getRows(storyBoardIndex);

        return {
          page: pageIndex,
          index: thumbnailIndex,
          row: row,
          col: col
        };
      },

      /**
       * nページ目のx, y座標をmsに変換して返す
       */
      getPointMs: function(x, y, page, storyBoardIndex) {
        var width  = Math.max(1, this.getWidth(storyBoardIndex));
        var height = Math.max(1, this.getHeight(storyBoardIndex));
        var row = Math.floor(y / height);
        var col = Math.floor(x / width);
        var mod = x % width;


        // 何番目のサムネに相当するか？
        var point =
          page * this.getCountPerPage(storyBoardIndex) +
          row  * this.getCols(storyBoardIndex)         +
          col +
          (mod / width) // 小数点以下は、n番目の左端から何%あたりか
          ;

        // 全体の何%あたり？
        var percent = point / Math.max(1, this.getCount(storyBoardIndex));
        percent = Math.max(0, Math.min(100, percent));

        // msは㍉秒単位なので1000倍
        return Math.floor(this.getDuration() * percent * 1000);
      },

      /**
       * msは何ページ目に当たるか？を返す
       */
      getmsPage: function(ms, storyBoardIndex) {
        var index = this._storyBoard.getIndex(ms, storyBoardIndex);
        var page  = this._storyBoard.getPageIndex(index, storyBoardIndex);

        return page;
      },

      /**
       * nページ目のCols, Rowsがsubではどこになるかを返す
       */
      getPointPageColAndRowForSub: function(page, row, col) {
        var mainPageCount = this.getCountPerPage();
        var subPageCount  = this.getCountPerPage(1);
        var mainCols = this.getCols();
        var subCols = this.getCols(1);

        var mainIndex = mainPageCount * page + mainCols * row + col;
        var subOffset = mainIndex % subPageCount;

        var subPage = Math.floor(mainIndex / subPageCount);
        var subRow = Math.floor(subOffset / subCols);
        var subCol = subOffset % subCols;

        return {
          page: subPage,
          row: subRow,
          col: subCol
        };
      }

    });


    var SeekBarThumbnail = function() { this.initialize.apply(this, arguments); };
    SeekBarThumbnail.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
      <div class="zenzaSeekThumbnail">
        <div class="zenzaSeekThumbnail-image">
        </div>
      </div>
    */});
    SeekBarThumbnail.__css__ = ZenzaWatch.util.hereDoc(function() {/*
      .error .zenzaSeekThumbnail,
      .loading .zenzaSeekThumbnail {
        display: none !important;
      }

      .zenzaSeekThumbnail {
        display: none;
        pointer-events: none;
      }

      .seekBarContainer:not(.enableCommentPreview) .zenzaSeekThumbnail.show {
        display: block;
      }

      .zenzaSeekThumbnail-image {
        margin: 4px;
        background: none repeat scroll 0 0 #999;
        border: 1px inset;
        margin: auto;
      }

    */});
    _.extend(SeekBarThumbnail.prototype, AsyncEmitter.prototype);
    _.assign(SeekBarThumbnail.prototype, {
      initialize: function(params) {
        this._model      = params.model;
        this._$container = params.$container;
        this._scale      = _.isNumber(params.scale) ? params.scale : 1.0;

        this._preloadImages =
          _.debounce(this._preloadImages.bind(this), 60 * 1000 * 5);
        this._model.on('reset',  this._onModelReset.bind(this));
        this._model.on('update', this._onModelUpdate.bind(this));

        ZenzaWatch.debug.seekBarThumbnail = this;
      },
      _onModelUpdate: function() {
        if (!this._model.isAvailable()) {
          this._isAvailable = false;
          this.hide();
          return;
        }
        this.initializeView();

        var model = this._model;
        this._isAvailable = true;
        this._colWidth  = model.getWidth();
        this._rowHeight = model.getHeight();
        this._$image.css({
          width:  this._colWidth  * this._scale,
          height: this._rowHeight * this._scale,
          'background-size':
            (model.getCols() * this._colWidth  * this._scale) + 'px ' +
            (model.getRows() * this._rowHeight * this._scale) + 'px'
        });
        //this._$view.css('height', this._rowHeight * this + 4);

        this._preloadImages();
        this.show();
      },
      _onModelReset: function() {
        this.hide();
        this._imageUrl = '';
        if (this._$image) { this._$image.css('background-image', ''); }
      },
      _preloadImages: function() {
        // セッションの有効期限が切れる前に全部の画像をロードしてキャッシュに収めておく
        // やっておかないと、しばらく放置した時に読み込めない
        var model = this._model;
        if (!model.isAvailable()) {
          return;
        }
        var pages = model.getPageCount();
        var div = document.createElement('div');
        for (var i = 0; i < pages; i++) {
          var url = model.getPageUrl(i);
          var img = document.createElement('img');
          img.src = url;
          div.appendChild(img);
        }

        this._$preloadImageContainer.html(div.innerHTML);
      },
      show: function() {
        if (!this._$view) { return; }
        this._$view.addClass('show');
      },
      hide: function() {
        if (!this._$view) { return; }
        this._$view.removeClass('show');
      },
      initializeView: function() {
        this.initializeView = _.noop;

        if (!SeekBarThumbnail.styleAdded) {
          ZenzaWatch.util.addStyle(SeekBarThumbnail.__css__);
          SeekBarThumbnail.styleAdded = true;
        }
        var $view = this._$view = $(SeekBarThumbnail.__tpl__);
        this._$image = $view.find('.zenzaSeekThumbnail-image');

        this._$preloadImageContainer =
          $('<div class="preloadImageContaienr" style="display: none !important;"></div>');
        $('body').append(this._$preloadImageContainer);

        if (this._$container) {
          this._$container.append($view);
        }
      },
      setCurrentTime: function(sec) {
        if (!this._isAvailable || !this._model.isAvailable() || !this._$image) { return; }

        var ms = Math.floor(sec * 1000);
        var model = this._model;
        var pos = model.getThumbnailPosition(ms, 0);
        var url = model.getPageUrl(pos.page);
        var x = pos.col * this._colWidth  * -1 * this._scale;
        var y = pos.row * this._rowHeight * -1 * this._scale;
        var css = {};
        var updated = false;

        if (this._imageUrl !== url) {
          css.backgroundImage = 'url(' + url + ')';
          this._imageUrl = url;
          updated = true;
        }
        if (this._imageX !== x || this._imageY !== y) {
          css.backgroundPosition = x + 'px ' + y + 'px';
          this._imageX = x;
          this._imageY = y;
          updated = true;
        }

        if (updated) {
          this._$image.css(css);
        }
      }
    });

    var StoryBoard = function() { this.initialize.apply(this, arguments); };
    _.extend(StoryBoard.prototype, AsyncEmitter.prototype);
    _.assign(StoryBoard.prototype, {
      initialize: function(params) {

        //this._player = params.player;
        this._playerConfig  = params.playerConfig;
        this._$container    = params.$container;
        this._loader        = params.loader || ZenzaWatch.api.StoryBoardInfoLoader;


        this._initializeStoryBoard();
        ZenzaWatch.debug.storyBoard = this;
      },

      _initializeStoryBoard: function() {
        this._initializeStoryBoard = _.noop;

        if (!this._model) {
          this._model = new StoryBoardModel({
          });
        }
        if (!this._view) {
          this._view = new StoryBoardView({
            model: this._model,
            $container: this._$container,
            enable: this._playerConfig.getValue('enableStoryBoardBar')
          });
          this._view.on('select', function(ms) {
            this.emit('command', 'seek', ms / 1000);
          }.bind(this));
          this._view.on('command', function(command, param) {
            this.emit('command', command, param);
          });
        }
      },
      reset: function() {
        this._model.reset();
      },
      onVideoCanPlay: function(watchId, videoInfo) {
        if (!ZenzaWatch.util.isPremium()) { return; }
        if (!this._playerConfig.getValue('enableStoryBoard')) { return; }

        var url = videoInfo.getVideoUrl();
        if (!url.match(/smile\?m=/) || url.match(/^rtmp/)) {
          return;
        }

        this._initializeStoryBoard();
        this._watchId = watchId;
        ZenzaWatch.api.StoryBoardInfoLoader.load(url).then(
          this._onStoryBoardInfoLoad.bind(this),
          this._onStoryBoardInfoLoadFail.bind(this)
        );
      },
      _onStoryBoardInfoLoad: function(info) {
        window.console.log('onStoryBoardInfoLoad', info);
        this._model.update(info);
        this._$container.toggleClass('storyBoardAvailable', this._model.isAvailable());
      },
      _onStoryBoardInfoLoadFail: function(err) {
        window.console.log('onStoryBoardInfoFail', err);
        this._$container.removeClass('storyBoardAvailable');
      },

      getSeekBarThumbnail: function(params) {
        if (this._seekBarThumbnail) {
          return this._seekBarThumbnail;
        }
        this._seekBarThumbnail = new SeekBarThumbnail({
          model: this._model,
          $container: params.$container
        });
        return this._seekBarThumbnail;
      },

      setCurrentTime: function(sec) {
        if (this._view) {
          this._view.setCurrentTime(sec);
        }
      },

      _onStoryBoardSelect: function(ms) {
        this._emit('command', 'seek', ms / 100);
      },

      toggle: function() {
        if (this._view) {
          this._view.toggle();
          this._playerConfig.setValue('enableStoryBoardBar', this._view.isEnable());
        }
      }
    });


    var StoryBoardBlock = function() { this.initialize.apply(this, arguments); };
    _.assign(StoryBoardBlock.prototype, {
      initialize: function(option) {
        var height = option.boardHeight;

        this._backgroundPosition = '0 -' + height * option.row + 'px';
        this._src = option.src;
        this._page = option.page;
        this._isLoaded = false;

        var $view = $('<div class="board"/>')
          .css({
            width: option.pageWidth,
            height: height,
            backgroundPosition: '0 -' + height * option.row + 'px'
          })
          .attr({
            'data-src': option.src,
            'data-page': option.page,
            'data-top': height * option.row + height / 2,
            'data-backgroundPosition': this._backgroundPosition
          })
          .append(option.$inner);

        this._isLoaded = true;
        $view.css('background-image', 'url(' + option.src + ')');

        this._$view = $view;
       },
       loadImage: function() {
         if (this._isLoaded) {
           return;
         }
         var $view = this._$view;
         var img = new Image();
         img.onload = function() {
           $view
           .css({
             'background-image': 'url(' + this._src + ')',
             'background-position': this._backgroundPosition,
             'background-size': '',
           })
           .removeClass('lazyImage page-' + this._page);
           $view = img = null;
         }.bind(this);
         img.onerror = function() {
           $view = img = null;
         };
         img.src = this._src;
         this._isLoaded = true;
       },
       getPage: function() { return this._page; },
       getView: function() { return this._$view; }
    });
    var StoryBoardBlockBorder = function(width, height, cols) {
      this.initialize(width, height, cols);
    };
    _.assign(StoryBoardBlockBorder.prototype, {
      initialize: function(width, height, cols) {
        var $border = $('<div class="border"/>').css({
          width: width,
          height: height
        });
        var $div = $('<div />');
        for (var i = 0; i < cols; i++) {
          $div.append($border.clone());
        }
        this._$view = $div;
      },
      getView: function() {
        return this._$view.clone();
      }
    });

    var StoryBoardBlockList = function() { this.initialize.apply(this, arguments); };
    _.assign(StoryBoardBlockList.prototype, {
      initialize: function(storyBoard) {
        if (storyBoard) {
          this.create(storyBoard);
        }
      },
      create: function(storyBoard) {
        var pages      = storyBoard.getPageCount();
        var pageWidth  = storyBoard.getPageWidth();
        var width      = storyBoard.getWidth();
        var height     = storyBoard.getHeight();
        var rows       = storyBoard.getRows();
        var cols       = storyBoard.getCols();

        var totalRows = storyBoard.getTotalRows();
        var rowCnt = 0;
        this._$innerBorder =
          new StoryBoardBlockBorder(width, height, cols);
        var $view = $('<div class="boardList"/>')
          .css({
            width: storyBoard.getCount() * width,
            height: height
          });
        this._$view = $view;
        this._blocks = [];
        this._lazyLoaded = [];

        for (var i = 0; i < pages; i++) {
          var src = storyBoard.getPageUrl(i);
          for (var j = 0; j < rows; j++) {
            var option = {
              width: width,
              pageWidth: pageWidth,
              boardHeight: height,
              page: i,
              row: j,
              src: src
            };
            this.appendBlock(option);
            rowCnt++;
            if (rowCnt >= totalRows) {
              break;
            }
          }
        }

      },
      appendBlock: function(option) {
        option.$inner = this._$innerBorder.getView();
        var block = new StoryBoardBlock(option);
        this._blocks.push(block);
        this._$view.append(block.getView());
      },
      loadImage: function(pageNumber) {
        if (pageNumber < 1 || this._lazyLoaded[pageNumber]) {
          return;
        }
        this._lazyLoaded[pageNumber] = true;
        for (var i = 0, len = this._blocks.length; i < len; i++) {
          var block = this._blocks[i];
          if (block.getPage() <= pageNumber) {
            block.loadImage();
          }
        }
     },
     clear: function() {
       this._$view.remove();
       if (this._lazyLoadImageTimer) {
         window.clearTimeout(this._lazyLoadImageTimer);
       }
     },
     getView: function() {
        return this._$view;
     }
    });


    var StoryBoardView = function() { this.initialize.apply(this, arguments); }
    _.extend(StoryBoardView.prototype, AsyncEmitter.prototype);

    _.assign(StoryBoardView.prototype, {
      initialize: function(params) {
        console.log('%c initialize StoryBoardView', 'background: lightgreen;');
        this._$container = params.$container;

        var sb  = this._model = params.model;

        this._isHover = false;
        this._currentUrl = '';
        this._lastPage = -1;
        this._lastMs = -1;
        this._lastGetMs = -1;
        this._scrollLeft = 0;
        this._isEnable = _.isBoolean(params.enable) ? params.enable : true;

        sb.on('update', this._onStoryBoardUpdate.bind(this));
        sb.on('reset',  this._onStoryBoardReset .bind(this));

      },
      enable: function() {
        this._isEnable = true;
        if (this._$view && this._model.isAvailable()) {
          this.open();
        }
      },
      open: function() {
        if (!this._$view) { return; }
        this._$view.addClass('show');
        this._$body.addClass('zenzaStoryBoardOpen');
        this._$container.addClass('zenzaStoryBoardOpen');
      },
      close: function() {
        if (!this._$view) { return; }
        this._$view.removeClass('show');
        this._$body.removeClass('zenzaStoryBoardOpen');
        this._$container.removeClass('zenzaStoryBoardOpen');
      },
      disable: function() {
        this._isEnable = false;
        if (this._$view) {
          this.close();
        }
      },
      toggle: function(v) {
        if (typeof v === 'boolean') {
          if (v) { this.enable(); }
          else   { this.disable(); }
          return;
        }
        if (this._isEnable) {
          this.disable();
        } else {
          this.enable();
        }
      },
      isEnable: function() {
        return !!this._isEnable;
      },
      _initializeStoryBoard: function() {
        this._initializeStoryBoard = _.noop;
        window.console.log('%cStoryBoardView.initializeStoryBoard', 'background: lightgreen;');

        this._$body = $('body');

        ZenzaWatch.util.addStyle(StoryBoardView.__css__);
        var $view = this._$view = $(StoryBoardView.__tpl__);

        var $inner = this._$inner = $view.find('.storyBoardInner');
        this._$failMessage   = $view.find('.failMessage');
        this._$cursorTime    = $view.find('.cursorTime');
        //this._$disableButton = $view.find('.setToDisable button');

        $view
          .on('click',     '.board',   this._onBoardClick.bind(this))
        //  .on('click',     '.command', this._onCommandClick.bind(this))
          .on('mousemove', '.board',   this._onBoardMouseMove.bind(this))
          .on('mousemove', '.board', _.debounce(this._onBoardMouseMoveEnd.bind(this), 300))
          .on('wheel',            this._onMouseWheel   .bind(this))
          .on('wheel', _.debounce(this._onMouseWheelEnd.bind(this), 300));

        var onHoverIn  = function() { this._isHover = true;  }.bind(this);
        var onHoverOut = function() { this._isHover = false; }.bind(this);
        $inner
          .hover(onHoverIn, onHoverOut)
          .on('touchstart',  this._onTouchStart.bind(this))
          .on('touchend',    this._onTouchEnd  .bind(this))
          .on('touchmove',   this._onTouchMove .bind(this))
          .on('scroll', _.throttle(function() { this._onScroll(); }.bind(this), 500));

        //this._$disableButton.on('click', this._onDisableButtonClick.bind(this));

        this._$container.append($view);
        $('body').on('touchend', function() { this._isHover = false; }.bind(this));

        window.sb= $view;
      },
      _onBoardClick: function(e) {
        var $board = $(e.target).closest('.board'), offset = $board.offset();
        var y = $board.attr('data-top') * 1;
        var x = e.pageX - offset.left;
        var page = $board.attr('data-page');
        var ms = this._model.getPointMs(x, y, page);
        if (isNaN(ms)) { return; }

        var $view = this._$view;
        $view.addClass('clicked');
        window.setTimeout(function() { $view.removeClass('clicked'); }, 1000);
        this._$cursorTime.css({left: -999});

        this._isHover = false;
        if ($board.hasClass('lazyImage')) { this._lazyLoadImage(page); }

        this.emit('select', ms);
      },
      _onCommandClick: function(e) {
        var $command = $(e).closest('.command');
        var command = $command.attr('data-command');
        var param = $command.attr('data-param');
        if (!command) { return; }
        e.stopPropagation();
        e.preventDefault();
        this.emit('command', command, param);
      },
      _onBoardMouseMove: function(e) {
        var $board = $(e.target).closest('.board'), offset = $board.offset();
        var y = $board.attr('data-top') * 1;
        var x = e.pageX - offset.left;
        var page = $board.attr('data-page');
        var ms = this._model.getPointMs(x, y, page);
        if (isNaN(ms)) { return; }
        var sec = Math.floor(ms / 1000);

        var time = Math.floor(sec / 60) + ':' + ((sec % 60) + 100).toString().substr(1);
        this._$cursorTime.text(time).css({left: e.pageX});

        this._isHover = true;
        this._isMouseMoving = true;
        if ($board.hasClass('lazyImage')) { this._lazyLoadImage(page); }
      },
      _onBoardMouseMoveEnd: function(e) {
        this._isMouseMoving = false;
      },
      _onMouseWheel: function(e) {
        // 縦ホイールで左右スクロールできるようにする
        e.stopPropagation();
        var deltaX = parseInt(e.originalEvent.deltaX, 10);
        var delta  = parseInt(e.originalEvent.deltaY, 10);
        if (Math.abs(deltaX) > Math.abs(delta)) {
          // 横ホイールがある環境ならなにもしない
          return;
        }
        this._isHover = true;
        this._isMouseMoving = true;
        var left = this.scrollLeft();
        this.scrollLeft(left + delta * 10);
      },
      _onMouseWheelEnd: function(e, delta) {
        this._isMouseMoving = false;
      },
      _onTouchStart: function(e) {
        e.stopPropagation();
      },
      _onTouchEnd: function(e) {
        e.stopPropagation();
      },
      _onTouchMove: function(e) {
        e.stopPropagation();
        this._isHover = true;
      },
      _onTouchCancel: function(e) {
      },
      update: function() {
        this._isHover = false;
        this._timerCount = 0;
        this._scrollLeft = 0;

        this._initializeStoryBoard();

        this.close();
        this._$view.removeClass('success fail');
        if (this._model.getStatus() === 'ok') {
          this._updateSuccess();
        } else {
          this._updateFail();
        }
      },
      scrollLeft: function(left) {
        var $inner = this._$inner;
        if (!this._$inner) { return 0; }
      
        if (left === undefined) {
          return $inner.scrollLeft();
        } else if (left === 0 || Math.abs(this._scrollLeft - left) >= 1) {
          $inner.scrollLeft(left);
          this._scrollLeft = left;
        }
      },
      scrollToNext: function() {
        this.scrollLeft(this._model.getWidth());
      },
      scrollToPrev: function() {
        this.scrollLeft(-this._model.getWidth());
      },
      _updateSuccess: function() {
        var url = this._model.getUrl();
        var $view = this._$view;

        $view.addClass('success');
        if (this._currentUrl !== url) {
          // 前と同じurl == 同じ動画なら再作成する必要なし
          this._currentUrl = url;
          window.console.time('createStoryBoardDOM');
          this._updateSuccessDom();
          window.console.timeEnd('createStoryBoardDOM');
        }

        if (this._isEnable) {
          $view.addClass('opening show');
          this.scrollLeft(0);
          this.open();
          window.setTimeout(function() { $view.removeClass('opening'); }, 1000);
        }

      },
      _updateSuccessDom: function() {
        var list = new StoryBoardBlockList(this._model);
        this._storyBoardBlockList = list;
        this._$inner.empty().append(list.getView());
      },
      _lazyLoadImage: function(pageNumber) { //return;
        if (this._storyBoardBlockList) {
          this._storyBoardBlockList.loadImage(pageNumber);
        }
      },
      _updateFail: function() {
        this._$view.removeClass('success').addClass('fail');
      },
      clear: function() {
        if (this._$view) {
          this._$inner.empty();
        }
      },
      setCurrentTime: function(sec) {
        if (!this._model.isAvailable()) { return; }
        if (this._isHover) { return; }

        var ms = sec * 1000;
        var storyBoard = this._model;
        var duration = Math.max(1, storyBoard.getDuration());
        var per = ms / (duration * 1000);
        var width = storyBoard.getWidth();
        var boardWidth = storyBoard.getCount() * width;
        var targetLeft = boardWidth * per;

        this.scrollLeft(targetLeft);
      },
      _onScroll: function() {
        var storyBoard = this._model;
        var scrollLeft = this.scrollLeft();
        var page = Math.round(scrollLeft / (storyBoard.getPageWidth() * storyBoard.getRows()));
        this._lazyLoadImage(Math.min(page, storyBoard.getPageCount() - 1));
      },
      _onDisableButtonClick: function(e) {
        e.preventDefault();
        e.stopPropagation();

        var $button = this._$disableButton;
        $button.addClass('clicked');
        window.setTimeout(function() {
          $button.removeClass('clicked');
        }, 1000);

        this.emit('disableStoryBoard');
      },
      _onStoryBoardUpdate: function() {
        this.update();
      },
      _onStoryBoardReset:  function() {
        if (!this._$view) { return; }
        this.close();
        this._$view.removeClass('show fail');
      }
    });

    
    StoryBoardView.__tpl__ = [
        '<div id="storyBoardContainer" class="storyBoardContainer">',
          '<div class="storyBoardHeader">',
//            '<div class="setToDisable command" data-command="toggleStoryBoard"><button>閉じる　▼</button></div>',
            '<div class="cursorTime"></div>',
          '</div>',

          '<div class="storyBoardInner"></div>',
          '<div class="failMessage">',
          '</div>',
        '</div>',
        '',
      ''].join('');


    StoryBoardView.__css__ = ZenzaWatch.util.hereDoc(function() {/*
      .storyBoardContainer {
        position: fixed;
        bottom: -300px;
        left: 0;
        right: 0;
        width: 100%;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        background: #999;
        z-index: 9005;
        overflow: visible;
        box-shadow: 0 -2px 2px #666;

        transition: bottom 0.5s ease-in-out;
      }

      .storyBoardContainer.show {
        bottom: 40px;
        z-index: 50;
      }
      .storyBoardContainer:not(.show) {
        pointer-events: none;
        opacity: 0;

      }

      .storyBoardContainer .storyBoardInner {
        display: none;
        position: relative;
        text-align: center;
        overflow: hidden;
        white-space: nowrap;
        background: #222;
        margin: 0;
      }
      .storyBoardContainer .storyBoardInner::-webkit-scrollbar {
      }

      .storyBoardContainer .storyBoardInner:hover {
        overflow-x: auto;
      }

      .storyBoardContainer.success .storyBoardInner {
        display: block;
      }

      .storyBoardContainer .storyBoardInner .boardList {
        overflow: hidden;
      }

      .storyBoardContainer .boardList .board {
        display: inline-block;
        cursor: pointer;
        background-color: #101010;
      }

      .storyBoardContainer.clicked .storyBoardInner * {
        opacity: 0.3;
        pointer-events: none;
      }

      .storyBoardContainer.opening .storyBoardInner .boardList .board {
        pointer-events: none;
      }

      .storyBoardContainer .boardList .board.lazyImage:not(.hasSub) {
        background-color: #ccc;
        cursor: wait;
      }
      .storyBoardContainer .boardList .board.loadFail {
        background-color: #c99;
      }

      .storyBoardContainer .boardList .board > div {
        white-space: nowrap;
      }
      .storyBoardContainer .boardList .board .border {
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        border-style: solid;
        border-color: #000 #333 #000 #999;
        border-width: 0     2px    0  2px;
        display: inline-block;
        pointer-events: none;
      }

      .storyBoardContainer .storyBoardHeader {
        position: relative;
        width: 100%;
      }

      .storyBoardContainer .cursorTime {
        display: none;
        position: absolute;
        bottom: -30px;
        left: -999px;
        font-size: 10pt;
        border: 1px solid #000;
        z-index: 9010;
        background: #ffc;
        pointer-events: none;
      }
      .storyBoardContainer:hover .cursorTime {
        display: block;
      }

      .storyBoardContainer.clicked .cursorTime,
      .storyBoardContainer.opening .cursorTime {
        display: none;
      }

      
      .storyBoardContainer .setToDisable {
        position: absolute;
        display: inline-block;
        left: 50px;
        bottom: -32px;
        transition: bottom 0.3s ease-in-out;
      }

      .storyBoardContainer:hover .setToDisable {
        bottom: 0;
      }
      
      .storyBoardContainer .setToDisable button,
      .setToEnableButtonContainer button {
        background: none repeat scroll 0 0 #999;
        border-color: #666;
        border-radius: 18px 18px 0 0;
        border-style: solid;
        border-width: 2px 2px 0;
        width: 200px;
        overflow: auto;
        white-space: nowrap;
        cursor: pointer;
        box-shadow: 0 -2px 2px #666;
      }
      

      .full_with_browser .setToEnableButtonContainer button {
        box-shadow: none;
        color: #888;
        background: #000;
      }

      .full_with_browser .storyBoardContainer .setToDisable,
      .full_with_browser .setToEnableButtonContainer {
        background: #000; {* Firefox対策 *}
      }

      .setToEnableButtonContainer button {
        width: 200px;
      }

      .storyBoardContainer .setToDisable button:hover,
      .setToEnableButtonContainer:not(.loading):not(.fail) button:hover {
        background: #ccc;
        transition: none;
      }

      .storyBoardContainer .setToDisable button.clicked,
      .setToEnableButtonContainer.loading button,
      .setToEnableButtonContainer.fail button,
      .setToEnableButtonContainer button.clicked {
        border-style: inset;
        box-shadow: none;
      }

      .setToEnableButtonContainer {
        position: fixed;
        z-index: 9003;
        right: 300px;
        bottom: 0px;
        transition: bottom 0.5s ease-in-out;
      }

      .setToEnableButtonContainer.loadingVideo {
        bottom: -50px;
      }

      .setToEnableButtonContainer.loading *,
      .setToEnableButtonContainer.loadingVideo *{
        cursor: wait;
        font-size: 80%;
      }
      .setToEnableButtonContainer.fail {
        color: #999;
        cursor: default;
        font-size: 80%;
      }

    */});


//===END===

