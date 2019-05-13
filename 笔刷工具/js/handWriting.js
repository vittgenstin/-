$(function() {
    var offCanvas = $('.offCanvas')[0]; // 用于更换背景图
    var offCtx = offCanvas.getContext('2d');
    var canvas = $('.canvas')[0]; // 用于涂鸦
    var ctx = canvas.getContext('2d');

    var lastCoordinate = null; // 前一个坐标
    var lastTimestamp = 0; // 前一个时间戳
    var lastLineWidth = -1; // 用于线光滑过度
    var point = null; // 存储鼠标或触发坐标
    var sizeWidth = 30; // 中笔触计算值
    var strokeColor = '#000'; // 笔触颜色默认黑色
    var imgSrc = null; // 背景图片地址
    var imgArray = []; // 存储背景图和涂鸦图
    var rubberSize = 25; // 存储橡皮檫大小
    var flag = true; // 用于判断涂鸦还是擦除
    var footerHeight = $('.footer').height(); // 获取底部高度

    offCanvas.width = $(window).width();
    offCanvas.height = $(window).height() - footerHeight;
    canvas.width = $(window).width();
    canvas.height = $(window).height() - footerHeight;

    // 选择颜色
    $('.lineColors span').click(function() {
        strokeColor = $(this).attr('data-color'); // 获取颜色值，用于替换笔触颜色
        var colorName = $(this).attr('data-text'); // 获取颜色文字，用于替换操作栏文字
        $('.colorButton span').html(colorName); // 替换操作栏文字

        animatePanel('.colors-panel', '-130px', '.control-button', '60px'); // 收起颜色列表显示操作栏
    });
    // 选择大小
    $('.lineSizes span').click(function() {
        sizeWidth = $(this).attr('data-lineWidth'); // 获取大小值，用于计算笔触大小
        var sizeName = $(this).attr('data-text'); // 获取大小文字，用于替换操作栏文字
        $('.sizeButton span').html(sizeName); // 替换操作栏文字

        animatePanel('.size-panel', '-130px', '.control-button', '60px'); // 收起大小列表显示操作栏
    });    
    // canvas触摸事件
    $('.canvas').on('touchstart', function(event) {
        point = { x: event.originalEvent.targetTouches[0].clientX, y: event.originalEvent.targetTouches[0].clientY };
        lastCoordinate = windowToCanvas(point.x, point.y);
        lastTimestamp = new Date().getTime();
    });
    $('.canvas').on('touchmove', function(event) {
        point = { x: event.originalEvent.targetTouches[0].clientX, y: event.originalEvent.targetTouches[0].clientY };
        var curCoordinate = windowToCanvas(point.x, point.y);        

        if (flag) { // 涂鸦
            var curTimestamp = new Date().getTime();
            var s = calcDistance(lastCoordinate, curCoordinate); // 计算两点之间的距离         
            var t = curTimestamp - lastTimestamp; // 计算两点之间的时间差
            var curLineWidth = caleLineWidth(s, t, sizeWidth);

            drawLine(ctx, lastCoordinate.x, lastCoordinate.y, curCoordinate.x, curCoordinate.y, curLineWidth, strokeColor);

            lastCoordinate = curCoordinate; // 现在坐标替换前一个坐标
            lastTimestamp = curTimestamp;
            lastLineWidth = curLineWidth;
        } else { // 擦掉
            ctx.save();
            ctx.beginPath();
            ctx.arc(curCoordinate.x, curCoordinate.y, rubberSize/2, 0, Math.PI * 2);
            ctx.clip();
            ctx.clearRect(curCoordinate.x - rubberSize/2, curCoordinate.y - rubberSize/2, rubberSize, rubberSize); // 清除涂鸦画布内容
            ctx.restore();
        }
    });
    $('.canvas').on('touchend', function() {
        var imageSrc = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream'); // 画布转换为图片地址
        $('.lineBox').append('<img src="' + imageSrc + '" />');
        var boxWidth = $('.lineBox img').length * 80; // 80为图片宽度（72）+间隔（8）
        $('.lineBox').css({ // 设置lineBox宽度
            width: boxWidth + 'px'
        });
    });

    // 根据不同速度计算线的宽度函数
    function caleLineWidth(s, t, brushWidth) {
        var v = s / t; // 获取速度
        // 声明最大最小速度和最大最小边界
        var maxVelocity = 10,
            minVelocity = 0.1,
            maxLineWidth = Math.min(30, canvas.width / brushWidth), // 避免手机端线条太粗
            minLineWidth = 1,
            resultLineWidth; // 用于返回的线宽度

        if (v <= minVelocity) {
            resultLineWidth = maxLineWidth;
        } else if (v >= maxVelocity) {
            resultLineWidth = minLineWidth;
        } else {
            resultLineWidth = maxLineWidth - (v - minVelocity) / (maxVelocity - minVelocity) * (maxLineWidth - minLineWidth);
        }
        if (lastLineWidth == -1) { // 开始时候
            return resultLineWidth;
        } else {
            return resultLineWidth * 2 / 3 + lastLineWidth * 1 / 3; // lastLineWidth占得比重越大越平滑
        }
    }
    // 计算两点之间的距离函数
    function calcDistance(lastCoordinate, curCoordinate) {
        var distance = Math.sqrt(Math.pow(curCoordinate.x - lastCoordinate.x, 2) + Math.pow(curCoordinate.y - lastCoordinate.y, 2));
        return distance;
    }
    // 坐标转换
    function windowToCanvas(x, y) {
        var bbox = canvas.getBoundingClientRect();
        return { x: x - bbox.left, y: y - bbox.top };
    }
    // 绘制直线
    function drawLine(context, x1, y1, x2, y2, /*optional*/ lineWidth, /*optional*/ strokeColor) {
        context.beginPath();
        context.lineTo(x1, y1);
        context.lineTo(x2, y2);

        context.lineWidth = lineWidth;
        context.lineCap = 'round'; // 线与线交合不会产生空隙
        context.lineJoin = 'round';
        context.strokeStyle = strokeColor; // 默认笔触黑色

        context.stroke();
    }
    // 选择背景
    $('.bg-panel img').click(function() {
        imgSrc = $(this).attr('src'); // 获取图片src
        drawImg(imgSrc); // 画图

        animatePanel('.bg-panel', '-130px', '.control-button', '60px');
    });
    // 绘制图像到画布
    function drawImg(changeValue) {
        offCtx.clearRect(0, 0, canvas.width, canvas.height); // 先清除画布
        var changeImg = new Image();
        changeImg.src = changeValue;
        changeImg.onload = function() {
            offCtx.drawImage(changeImg, 0, 0, canvas.width, canvas.height);
        };
    }
    // 清屏
    $('.clearButton').click(function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除涂鸦画布内容
        offCtx.clearRect(0, 0, canvas.width, canvas.height); // 清除背景图画布内容
    });
    // 保存涂鸦效果
    $('.saveButton').click(function() {
        // toDataURL兼容大部分浏览器，缺点就是保存的文件没有后缀名
        if (imgSrc) { // 存在背景图才执行
            imgArray.push(offCanvas.toDataURL('image/png').replace('image/png', 'image/octet-stream'));
        }
        imgArray.push(canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream'));

        compositeGraph(imgArray);
    });
    /**
     * [离屏合成图]
     * @param  {[type]} imgArray   [背景图画布和涂鸦画布的地址数组]
     */
    function compositeGraph(imgArray) {
        // 下载后的文件名
        var filename = 'canvas_' + (new Date()).getTime() + '.png';

        var compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = canvas.width;
        compositeCanvas.height = canvas.height;
        var compositeCtx = compositeCanvas.getContext('2d');
        $.each(imgArray, function(index, val) {
            $('.offImgs').append('<img src="' + val + '" />'); // 增加img元素用于获取合成
        });
        $.each($('.offImgs img'), function(index, val) {
            val.onload = function() {
                compositeCtx.drawImage(val, 0, 0); // 循环绘制图片到离屏画布
            };
        });
        var timer = setTimeout(function() {
            var compositeImg = compositeCanvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
            saveFile(compositeImg, filename);
            timer = null; // 注销定时器
        }, 50);
    }
    /**
     * 模拟鼠标点击事件进行保存
     * @param  {String} data     要保存到本地的图片数据
     * @param  {String} filename 文件名
     */
    function saveFile(data, filename) {
        var saveLink = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
        saveLink.href = data;
        saveLink.download = filename; // download只兼容chrome和firefox，需要兼容全部浏览器，只能用服务器保存

        var event = document.createEvent('MouseEvents');
        event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        saveLink.dispatchEvent(event);
    }
    // 点击颜色按钮弹出颜色列表
    $('.colorButton').click(function() {
        animatePanel('.control-button', '-60px', '.colors-panel', '130px');
        flag = true; // 点击颜色时候变为涂鸦状态
    });
    // 点击颜色列表的关闭按钮
    $('.colors-panel .closeBtn').click(function() {
        animatePanel('.colors-panel', '-130px', '.control-button', '60px');
    });
    // 点击大小按钮弹出大小列表
    $('.sizeButton').click(function() {
        animatePanel('.control-button', '-60px', '.size-panel', '130px');
        flag = true; // 点击大小时候变为涂鸦状态
    });
    // 点击大小列表的关闭按钮
    $('.size-panel .closeBtn').click(function() {
        animatePanel('.size-panel', '-130px', '.control-button', '60px');
    });
    // 点击背景按钮弹出背景列表
    $('.bgButton').click(function() {
        animatePanel('.control-button', '-60px', '.bg-panel', '130px');
    });
    // 点击背景列表的关闭按钮
    $('.bg-panel .closeBtn').click(function() {
        animatePanel('.bg-panel', '-130px', '.control-button', '60px');
    });
    // 点击擦掉按钮弹出橡皮檫大小列表
    $('.rubberButton').click(function() {
        animatePanel('.control-button', '-60px', '.rubber-panel', '130px');
        flag = false; // 点击擦掉时候变为橡皮檫状态
    });
    // 点击橡皮檫大小列表的关闭按钮
    $('.rubber-panel .closeBtn').click(function() {
        animatePanel('.rubber-panel', '-130px', '.control-button', '60px');
    });
    // 拖动滑动条获取数值
    $('.rubbers .second input').on('touchmove', function() {
        rubberSize = $(this)[0].value;
        $('.rubberSize').html(rubberSize);
    });
    // 点击历史按钮弹出历史记录列表
    $('.historyButton').click(function() {
        animatePanel('.control-button', '-60px', '.history-panel', '130px');
    });
    // 点击历史记录列表的关闭按钮
    $('.history-panel .closeBtn').click(function() {
        animatePanel('.history-panel', '-130px', '.control-button', '60px');
    });
    // 点击历史记录图片绘制到画布
    $('.lineBox').on('click', 'img', function() { // 事件委托
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage($(this)[0], 0, 0, canvas.width, canvas.height); // 绘制点击的图片到画布
    });

    // 底部操作栏和弹出框交互函数
    function animatePanel(fName, fHeight, sName, sHeight) {
        $(fName).slideUp(300);
        $('.footer').animate({'bottom': fHeight}, 300);
        var timer = setTimeout(function() {
            $(sName).slideDown(500);
            $('.footer').animate({'bottom': 0, 'height': sHeight}, 500);
            timer = null;
        }, 0);
    }
    // 阻止手机滑动时拖动页面
    $('.wrapper').on('touchmove', function(event) {
        event.preventDefault();
    });
});