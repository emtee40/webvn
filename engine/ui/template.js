webvn.use(function (ui) { ui.template.create({
    "cg": "<div class=\"ui-title\">Gallery</div>\r\n<ul class=\"container\">\r\n</ul>\r\n<ul class=\"pagination\">\r\n</ul>\r\n<div class=\"close button\">Close</div>\r\n<div class=\"viewer fill hidden\">\r\n    <img src=\"\" />\r\n</div>\r\n",
    "config": "<div class=\"ui-title\">Setting</div>\r\n<ul class=\"container\">\r\n    <li>\r\n        <label>文字显示速度</label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label>自动推进速度</label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label>背景音乐音量</label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label>效果音量</label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label>语音音量</label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n</ul>\r\n<div class=\"close button\">Close</div>",
    "dialog": "<div class=\"wrapper\">\r\n    <div class=\"name\"></div>\r\n    <div class=\"content\">\r\n        <img class=\"face\" src=\"\"/>\r\n        <span class=\"text\"></span>\r\n    </div>\r\n    <ul class=\"controls\">\r\n        <li class=\"qsave\">Q-Save</li>\r\n        <li class=\"qlave\">Q-Load</li>\r\n        <li class=\"save\"><%= Save %></li>\r\n        <li class=\"load\"><%= Load %></li>\r\n        <li class=\"config\"><%= Config %></li>\r\n        <li class=\"log\">Log</li>\r\n        <li class=\"exit\">Exit</li>\r\n    </ul>\r\n</div>",
    "menu": "<ul>\r\n    <li class=\"start\"><%= Start %></li>\r\n    <li class=\"load\"><%= Load %></li>\r\n    <li class=\"cg\"><%= Gallery %></li>\r\n    <li class=\"music\"><%= Music %></li>\r\n    <li class=\"setting\"><%= Config %></li>\r\n</ul>",
    "music": "<div class=\"ui-title\">Music</div>\r\n<ul class=\"container\">\r\n</ul>\r\n<div class=\"progress\">\r\n    <span></span>\r\n</div>\r\n<div class=\"close button\">Close</div>\r\n<ul class=\"controls\">\r\n    <li class=\"previous button disabled\">&lt;&lt;</li>\r\n    <li class=\"play button disabled\">Play</li>\r\n    <li class=\"next button disabled\">&gt;&gt;</li>\r\n</ul>",
    "save": "<div class=\"ui-title\"><%= Title %></div>\r\n<ul class=\"container\">\r\n    <% util.each(records, function (record, index) { %>\r\n        <li class=\"<%= type %>\" data-num=\"<%= index %>\">\r\n            <span>\r\n                <%= record.title %><br><br>\r\n                <%= record.date %>\r\n            </span>\r\n        </li>\r\n    <% }) %>\r\n</ul>\r\n<div class=\"close button\"><%= Close %></div>\r\n",
    "video": "<video class=\"fill\"></video>"
});});