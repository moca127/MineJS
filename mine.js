'use strict';

let fs = require('fs');
let path = require('path');

/* global minejs */
global.minejs = {};
minejs.ANSI = true;

minejs.VERSION = "1.0";
minejs.MINECRAFT_VERSION = "0.15";
minejs.API_VERSION = "1.0.0";
minejs.CODENAME = "유성(meteor)";
minejs.PLUGIN_PATH = __dirname + '/plugins';

/** OOP 형태로 노드 프로그램 소스파일 체계를
관리할 수 있도록 돕는 프로그램 로더입니다. **/
global.minejs.loader = {
    /** 이곳에 각 플러그인/프로그램의 소스폴더 주소가 담깁니다. **/
    sources : {},
    
    /** 로딩된 JS파일들이 담깁니다.
    '경로명': (불려와진모듈) 의 형태로 저장됩니다. **/
    modules: {},
    
    /** 글로벌 변수 minejs에 실제 폴더계층대로 하위 변수를 생성합니다. **/
    treeLoader : (sourceFolderPath, originPath, prefix) => {
        fs.readdirSync(sourceFolderPath).forEach(function (file) {
            let filePath = path.join(sourceFolderPath, file);
            let stat = fs.statSync(filePath);
            try{
                let tree = sourceFolderPath.split(originPath)[1];
                tree = prefix + tree.replace(new RegExp("/", 'g'), '.');
                if(eval("!" + tree))
                    eval(tree + " = {};");
                if (stat.isDirectory())
                    global.minejs.loader.treeLoader(filePath, originPath, prefix);
            }catch(e){}
        });
    },
    
    /** 지정된 폴더안에 있는 모든 소스파일들을 로드해옵니다. **/
    sourceLoader: (sourceFolderPath) => {
        fs.readdirSync(sourceFolderPath).forEach(function (file) {
            let filePath = path.join(sourceFolderPath, file);
            let stat = fs.statSync(filePath);
            try{
                if (stat.isFile()) {
                    global.minejs.loader.modules[filePath] = require(filePath);
                } else {
                    global.minejs.loader.sourceLoader(filePath);
                }
            }catch(e){}
        });
    },
    
    /** 종속성이 있는 소스가 있을때 필요한 소스를 바로 로드합니다. **/
    requireLoader: (requireSourcePath) => {
        let splitPath = requireSourcePath.split(".");
        let prefix = null;
        let prefixCount = 0;
        
        for(let checkCount = 0 ; checkCount < splitPath.length ; checkCount++){
            let checkPrefix = "";
            for(let i = 0 ; i <= checkCount ; i++){
                if(i != 0) checkPrefix += ".";
                checkPrefix += splitPath[i];
            }
            if(global.minejs.loader.sources[checkPrefix] != null){
                prefix = checkPrefix;
                prefixCount = checkCount;
                break;
            }
        }
        
        if(!prefix) return false;
        
        let requireAbsolutePath = "";
        for(let key in splitPath)
            if(key > prefixCount) requireAbsolutePath += ("/" + splitPath[key]);
        let path = global.minejs.loader.sources[prefix] + requireAbsolutePath;
        
        /** 이미 로드된 소스일 경우 로드하지 않음 **/
        if(global.minejs.loader.modules[path] != null) return;
        
        let preLoadModule = require(path);
        if (typeof(preLoadModule.onInit) === 'function') preLoadModule.onInit();
        if (typeof(preLoadModule.onLoad) === 'function') preLoadModule.onLoad();
        global.minejs.loader.modules[path] = preLoadModule;
        return true;
    },
    
    /** 소스폴더를 원하는 네임스페이스와 함께 등록합니다.
    minejs 와 같이 단문장도 되고, develper_name.plugin_name
    같이 개발자명 뒤에 플러그인이름을 붙이는 것도 가능합니다. **/
    registerSourceFolder : (prefix, directory) => {
        global.minejs.loader.sources[prefix] = directory;
    }
};


/** 소스폴더 위치를 지정합니다. **/
let sourceFolder = path.join(__dirname, "sources");

/** 소스폴더를 등록합니다. **/
global.minejs.loader.registerSourceFolder("minejs", sourceFolder);

/** 소스트리를 생성합니다. **/
global.minejs.loader.treeLoader(sourceFolder, sourceFolder, "minejs");

/** 소스파일들을 불러옵니다. **/
global.minejs.loader.sourceLoader(sourceFolder);


/** 서버가 로딩될 때 해당 코드를 실행합니다. **/
for (let key in global.minejs.loader.modules)
    if (typeof(global.minejs.loader.modules[key].onInit) === 'function') global.minejs.loader.modules[key].onInit();
for (let key in global.minejs.loader.modules)
    if (typeof(global.minejs.loader.modules[key].onLoad) === 'function') global.minejs.loader.modules[key].onLoad();



/** 서버를 시작시킬때 해당 함수를 실행합니다. **/
var start = () => {
    /** Run Server init method **/
    new minejs.Server(__dirname, require(__dirname + '/settings.json'));
};

/** 서버에서 사용할 언어를 선택합니다. **/
try{
    let stat = fs.statSync(__dirname + '/settings.json');
    start();
}catch(e){
    try{
    var langList = require(__dirname + "/resources/language-list.json");
    }catch(e){
        console.log("Can't find /resources/language-list.json file.");
        console.log("Program basic resources doesn't exist! failed statup!");
        return;
    }
    
    console.log('Please select the language you want to use.');
    for(let lang in langList) console.log(lang + " (" + langList[lang] + ")");
    
    /** 언어선택을 위해 콘솔 입력을 구현합니다. **/
    var readline = require('readline');
    var line = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    /** 선택이 입력될때 해당 내용을 임시로 처리합니다. **/
    line.on('line', function (input) {
        if(!langList[input]){
            console.log('These language is not support. please check up the list.\n');
            console.log('Please select the language you want to use.');
            for(let lang in langList) console.log(lang + " (" + langList[lang] + ")");
        }else{
            /** 서버의 UUID를 생성합니다. **/
            let settings = require(__dirname + "/resources/lang/" + input + "/settings.json");
            let lang = require(__dirname + "/resources/lang/" + input + "/lang.json");
            if(!settings.server_uuid)
                settings.server_uuid = require('node-uuid').v4();
                
            fs.writeFileSync(__dirname + '/settings.json', JSON.stringify(settings, null, 4), 'utf8');
            fs.writeFileSync(__dirname + '/lang.json', JSON.stringify(lang, null, 4), 'utf8');
            line.close();
            start();
        }
    });
}