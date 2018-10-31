(function($root){




// IE8 does not support array.indexOf
if (!Array.prototype.indexOf)
{
	/** @ignore */
	Array.prototype.indexOf = function(item, i) {
		i || (i = 0);
		var length = this.length;
		if (i < 0) i = length + i;
		for (; i < length; i++)
			if (this[i] === item) return i;
		return -1;
	};
}

// avoid Node error
var document = $root.document;
if (!document)
{
	if (typeof(window) !== 'undefined')
		document = window.document;
}


// check if is in Node.js environment
var isNode = (typeof process === 'object') && (typeof process.versions === 'object') && (typeof process.versions.node !== 'undefined');

if (isNode)
{
	var __nodeContext = {};
}

if (!isNode)
{
	var readyState = document && document.readyState;
	var isIE = window.attachEvent && !window.opera;
	var docReady = (readyState === 'complete' || readyState === 'loaded' ||
		(readyState === 'interactive' && !isIE));  // in IE8-10, handling this script cause readyState to 'interaction' but the whole page is not loaded yet
}

function directAppend(doc, libName)
{
  doc.write('<script type="text/javascript" src="'+libName+'"><\/script>');
}
function nodeAppend(url)
{
	if (isNode)
	{
		try
		{
			var vm = require("vm");
			var fs = require("fs");
			var data = fs.readFileSync(url);
			//console.log('[k] node append', url, data.length);
			vm.runInThisContext(data, {'filename': url});
			//vm.runInNewContext(data, __nodeContext, {'filename': url});
			//eval(data);
		}
		catch(e)
		{
			// may be in webpack? Need further investigation
			/*
			if ($root.require)
			{
				var extPos = url.toLowerCase().lastIndexOf('.js');
				var coreFileName;
				if (extPos >= 0)
				{
					coreFileName = url.substr(0, extPos);
				}
				if (coreFileName)
					require('./' + fileName + '.js');
				else
					require('./' + fileName);
			}
			*/
		}
	}
}

var existedScriptUrls = [];
function appendScriptFile(doc, url, callback)
{
	if (existedScriptUrls.indexOf(url) >= 0)  // already loaded
	{
		if (callback)
			callback();
		return;
	}
	if (isNode)
	{
		nodeAppend(url);
		callback();
	}
	else // browser
	{
		var result = doc.createElement('script');
		result.src = url;
		result.onload = result.onreadystatechange = function(e)
		{
			if (result._loaded)
				return;
			var readyState = result.readyState;
			if (readyState === undefined || readyState === 'loaded' || readyState === 'complete')
			{
				result._loaded = true;
				result.onload = result.onreadystatechange = null;
				existedScriptUrls.push(url);
				if (callback)
					callback();
			}
		};
		(doc.getElementsByTagName('head')[0] || doc.body).appendChild(result);
		//console.log('load script', url);
		return result;
	}
}
function appendScriptFiles(doc, urls, callback)
{
	var dupUrls = [].concat(urls);
	_appendScriptFilesCore(doc, dupUrls, callback);
}
function _appendScriptFilesCore(doc, urls, callback)
{
	if (urls.length <= 0)
	{
		if (callback)
			callback();
		return;
	}
	var file = urls.shift();
	appendScriptFile(doc, file, function()
		{
			appendScriptFiles(doc, urls, callback);
		}
	);
}

function loadChildScriptFiles(scriptUrls, forceDomLoader, callback)
{
	if (isNode)  // Node.js environment
	{
		appendScriptFiles(document, scriptUrls, function()
		{
			// set a marker indicate that all modules are loaded
			(this.Che || __nodeContext.Che)._loaded();
			if (callback)
				callback();
		});
	}
	else  // in normal browser environment
	{
		if (!docReady && !forceDomLoader)  // can directly write to document
		{
			for (var i = 0, l = scriptUrls.length; i < l; ++i)
				directAppend(document, scriptUrls[i]);

			var sloadedCode = 'if (this.Che) Che._loaded();';
			/*
			 if (window.btoa)  // use data uri to insert loaded code, avoid inline script problem in Chrome extension (still no use in Chrome)
			 {
			 var sBase64 = btoa(sloadedCode);
			 var sdataUri = 'data:;base64,' + sBase64;
			 directAppend(document, sdataUri);
			 }
			 else  // use simple inline code in IE below 10 (which do not support data uri)
			 */
			//directAppend(document, 'Che.loaded.js');  // manully add small file to mark lib loaded
			document.write('<script type="text/javascript">' + sloadedCode + '<\/script>');
			if (callback)
				callback();
		}
		else
			appendScriptFiles(document, scriptUrls, function()
			{
				// set a marker indicate that all modules are loaded
				Che._loaded();
				if (callback)
					callback();
			});
	}
}

var CheFiles = {
	'lan': {
		'files': [
			'lan/json2.js',
			'lan/classes.js',
			'lan/xmlJsons.js',
			'lan/serializations.js'
		],
		'category': 'lan',
		'minFile': 'root.js'
	},
	'root': {
		'files': [
			'core/Che.root.js'
		],
		'category': 'root',
		'minFile': 'root.js'
	},

	'localization': {
		'requires': ['lan', 'root'],
		'files': [
			'localization/Che.localizations.js'
			/*
			'localization/en/Che.localize.general.en.js',
			'localization/en/Che.localize.widget.en.js',
			'localization/en/Che.localize.objDefines.en.js'
			/*
			'localization/zh/Che.localize.general.zh.js',
			'localization/zh/Che.localize.widget.zh.js'
			*/
		],
		'category': 'localization',
		'minFile': 'localization.js'
	},
	'localizationData': {
		'requires': ['localization'],
		'files': [
			'localization/en/Che.localize.general.en.js',
			'localization/en/Che.localize.widget.en.js',
			'localization/en/Che.localize.objDefines.en.js'
		],
		'category': 'localization',
		'minFile': 'localization.js'
	},

	'common': {
		'requires': ['lan', 'root', 'localization'],
		'files': [
			'core/Che.common.js',
			'core/Che.exceptions.js',
			'utils/Che.utils.js'
		],
		'category': 'common',
		'minFile': 'common.js'
	},

	'core': {
		'requires': ['lan', 'root', 'common', 'data'],
		'files': [
			'core/Che.configs.js',
			'core/Che.elements.js',
			'core/Che.electrons.js',
			'core/Che.valences.js',
			'core/Che.structures.js',
			'core/Che.structureBuilder.js',
			'core/Che.reactions.js',
			'core/Che.chemUtils.js',

			'chemdoc/Che.glyph.base.js',
			'chemdoc/Che.glyph.pathGlyphs.js',
			'chemdoc/Che.glyph.lines.js',
			'chemdoc/Che.glyph.chemGlyphs.js',
			'chemdoc/Che.contentBlocks.js',
			'chemdoc/Che.attachedMarkers.js',
			'chemdoc/Che.commonChemMarkers.js'
		],
		'category': 'core'
	},

	'html': {
		'requires': ['lan', 'root', 'common'],
		'files': [
			'xbrowsers/Che.x.js',
			'html/Che.nativeServices.js',
			'html/Che.predefinedResLoaders.js',
			'utils/Che.domUtils.js',
			'utils/Che.domHelper.js'
		],
		'category': 'core'
	},

	'io': {
		'requires': ['lan', 'root', 'common', 'core'],
		'files': [
			'utils/Che.textHelper.js',
			'io/Che.io.js',
			'io/cml/Che.io.cml.js',
			'io/mdl/Che.io.mdlBase.js',
			'io/mdl/Che.io.mdl2000.js',
			'io/mdl/Che.io.mdl3000.js',
			'io/mdl/Che.io.mdlIO.js',
			'io/smiles/Che.io.smiles.js',
			'io/native/Che.io.native.js'
		],
		'category': 'io'
	},

	'render': {
		'requires': ['lan', 'root', 'common', 'core', 'html'],
		'files': [
			'render/Che.render.extensions.js',
			'render/Che.render.base.js',
			'render/Che.render.renderColorData.js',
			'render/Che.render.utils.js',
			'render/Che.render.configs.js',
			'render/Che.render.baseTextRender.js',
			'render/Che.render.boundInfoRecorder.js',
			'render/2d/Che.render.renderer2D.js',
			'render/2d/Che.render.glyphRender2D.js',
			'render/2d/Che.render.canvasRenderer.js',
			'render/2d/Che.render.raphaelRenderer.js',
			'render/3d/Che.render.renderer3D.js',
			'render/3d/Che.render.threeRenderer.js',
			'render/Che.render.painter.js'
		],
		'category': 'render'
	},

	'widget': {
		'requires': ['lan', 'root', 'common', 'html'],
		'files': [
			'lib/hammer.js/hammer.js',

			'widgets/operation/Che.operations.js',
			'widgets/operation/Che.actions.js',

			'widgets/Che.widget.bindings.js',
			'widgets/Che.widget.base.js',
			'widgets/Che.widget.sys.js',
			'widgets/Che.widget.clipboards.js',
			'widgets/Che.widget.helpers.js',
			'widgets/Che.widget.styleResources.js',
			'widgets/Che.widget.autoLaunchers.js',
			'widgets/transitions/Che.widget.transitions.js',
			'widgets/transitions/Che.widget.transMgr.js',
			'widgets/commonCtrls/Che.widget.resizers.js',
			'widgets/commonCtrls/Che.widget.movers.js',
			'widgets/commonCtrls/Che.widget.images.js',
			'widgets/commonCtrls/Che.widget.containers.js',
			'widgets/commonCtrls/Che.widget.menus.js',
			'widgets/commonCtrls/Che.widget.buttons.js',
			'widgets/commonCtrls/Che.widget.formControls.js',
			'widgets/commonCtrls/Che.widget.nestedContainers.js',
			'widgets/commonCtrls/Che.widget.treeViews.js',
			'widgets/commonCtrls/Che.widget.dialogs.js',
			'widgets/commonCtrls/Che.widget.msgPanels.js',
			'widgets/commonCtrls/Che.widget.tabViews.js',
			'widgets/advCtrls/Che.widget.valueListEditors.js',
			'widgets/advCtrls/Che.widget.colorPickers.js',
			'widgets/advCtrls/Che.widget.textEditors.js',
			'widgets/advCtrls/Che.widget.widgetGrids.js',
			'widgets/advCtrls/objInspector/Che.widget.objInspectors.js',
			'widgets/advCtrls/objInspector/Che.widget.objInspector.propEditors.js',
			'widgets/advCtrls/objInspector/Che.widget.objInspector.operations.js',
			'widgets/advCtrls/Che.widget.configurators.js',
			'widgets/advCtrls/grids/Che.widget.dataSets.js',
			'widgets/advCtrls/grids/Che.widget.dataGrids.js',
			'widgets/sys/Che.widget.sysMsgs.js',

			'widgets/operation/Che.operHistoryTreeViews.js'  // debug
		],
		'category': 'widget'
	},

	'chemWidget': {
		'requires': ['lan', 'root', 'common', 'core', 'html', 'io', 'render', 'algorithm', 'widget'],
		'files': [
			'widgets/chem/Che.chemWidget.base.js',
			'widgets/chem/Che.chemWidget.dialogs.js',
			'widgets/chem/periodicTable/Che.chemWidget.periodicTables.js',
			'widgets/chem/Che.chemWidget.chemObjDisplayers.js',
			'widgets/chem/structureTreeView/Che.chemWidget.structureTreeViews.js',
			'widgets/chem/uiMarker/Che.chemWidget.uiMarkers.js',
			'widgets/chem/viewer/Che.chemWidget.viewers.js',
			'widgets/chem/viewer/Che.chemWidget.viewerGrids.js',
			'widgets/chem/viewer/Che.chemWidget.chemObjInserters.js',

			'widgets/chem/editor/Che.chemEditor.extensions.js',
			'widgets/chem/editor/Che.chemEditor.baseEditors.js',
			'widgets/chem/editor/Che.chemEditor.operations.js',
			'widgets/chem/editor/Che.chemEditor.editorUtils.js',
			'widgets/chem/editor/Che.chemEditor.configs.js',
			'widgets/chem/editor/Che.chemEditor.repositoryData.js',
			'widgets/chem/editor/Che.chemEditor.repositories.js',
			'widgets/chem/editor/Che.chemEditor.utilWidgets.js',
			'widgets/chem/editor/Che.chemEditor.chemSpaceEditors.js',
			'widgets/chem/editor/Che.chemEditor.nexus.js',
			'widgets/chem/editor/Che.chemEditor.composers.js',
			'widgets/chem/editor/Che.chemEditor.actions.js',
			'widgets/chem/editor/Che.chemEditor.trackParser.js',

			'widgets/chem/editor/Che.chemEditor.objModifiers.js',
			'widgets/chem/editor/modifiers/Che.chemEditor.styleModifiers.js',
			'widgets/chem/editor/modifiers/Che.chemEditor.textModifiers.js',
			'widgets/chem/editor/modifiers/Che.chemEditor.structureModifiers.js',

			'widgets/advCtrls/objInspector/Che.widget.objInspector.chemPropEditors.js'
		],
		'category': 'chemWidget'
	},

	'algorithm': {
		'requires': ['lan', 'root', 'common', 'core'],
		'files': [
			'algorithm/Che.graph.js',
			'algorithm/Che.structures.helpers.js',
			//'algorithm/Che.structures.comparers.js',
			'algorithm/Che.structures.canonicalizers.js',
			'algorithm/Che.structures.ringSearches.js',
			'algorithm/Che.structures.aromatics.js',
			'algorithm/Che.structures.standardizers.js',
			'algorithm/Che.structures.searches.js',
			'algorithm/Che.structures.stereos.js'
		],
		'category': 'algorithm'
	},

	'calculation': {
		'requires': ['lan', 'root', 'common', 'core', 'algorithm'],
		'files': [
			'calculation/Che.calc.base.js'
		]
	},

	'data': {
		'requires': ['root'],
		'files': [
			'data/Che.chemicalElementsData.js',
			'data/Che.isotopesData.organSet.js',
			'data/Che.structGenAtomTypesData.js',
			'data/Che.dataUtils.js'
		]
	},

	'emscripten': {
		'requires': ['root', 'common'],
		'files': [
			'_extras/Che.emscriptenUtils.js'
		],
		'category': 'extra'
	},

	'openbabel': {
		'requires': ['lan', 'root', 'core', 'emscripten', 'io'],
		'files': [
			'localization/en/Che.localize.extras.openbabel.en.js',
			'_extras/OpenBabel/Che.openbabel.base.js',
			'_extras/OpenBabel/Che.openbabel.io.js',
			'_extras/OpenBabel/Che.openbabel.structures.js'
		],
		'category': 'extra'
	},
	'indigo': {
		'requires': ['lan', 'root', 'core', 'emscripten', 'io'],
		'files': [
			'_extras/Indigo/Che.indigo.base.js',
			'_extras/Indigo/Che.indigo.io.js'
		],
		'category': 'extra'
	},
	'inchi': {
		'requires': ['lan', 'root', 'core', 'emscripten', 'io'],
		'files': [
			'_extras/InChI/Che.inchi.js'
		],
		'category': 'extra'
	},

	// Localization resources
	'localizationData.zh': {
		'requires': ['localization'],
		'files': [
			'localization/zh/Che.localize.general.zh.js',
			'localization/zh/Che.localize.widget.zh.js'
			//'localization/zh/Che.localize.objDefines.zh.js'
		],
		'category': 'localizationData.zh',
		'autoCompress': false  // do not compress js automatically
	}
};

var prequestModules = ['lan', 'root', 'localization', 'localizationData', 'common'];
var usualModules = prequestModules.concat(['core', 'html', 'io', 'render', 'widget', 'chemWidget', 'algorithm', 'calculation', 'data']);
var allModules = usualModules.concat(['emscripten', 'inchi', 'openbabel', 'indigo']);
var nodeModules = prequestModules.concat(['core', 'io', 'algorithm', 'calculation', 'data']);
var defaultLocals = [];

function getEssentialModules(modules)
{
	var ms = modules || usualModules;
	ms = prequestModules.concat(ms);
	var result = [];

	var pushModule = function(modules, moduleName)
	{
		if (modules.indexOf(moduleName) < 0)
		{
			var module = CheFiles[moduleName];
			if (module && module.requires)
			{
				for (var j = 0, k = module.requires.length; j < k; ++j)
				{
					var rm = module.requires[j];
					pushModule(modules, rm);
				}
			}
			modules.push(moduleName);
		}
	};
	for (var i = 0, l = ms.length; i < l; ++i)
	{
		var module = ms[i];
		pushModule(result, module);
	}
	return result;
}

function getEssentialFiles(modules, useMinFile)
{
	var ms = getEssentialModules(modules);
	var result = [];
	for (var i = 0, l = ms.length; i < l; ++i)
	{
		var moduleName = ms[i];
		var m = CheFiles[moduleName];
		if (m && m.files)
		{
			if (useMinFile)
			{
				var minFileName = m.minFile || (moduleName + '.js');
				if (result.indexOf(minFileName) < 0)
					result.push(minFileName);
			}
			else
				result = result.concat(m.files);
		}
	}
	return result;
}

function analysisEntranceScriptSrc(doc)
{
	var entranceSrc = /^(.*\/?)Che\.js(\?.*)?$/;
	var paramForceDomLoader = /^domloader\=(.+)$/;
	var paramMinFile = /^min\=(.+)$/;
	var paramModules = /^modules\=(.+)$/;
	var paramLocalDatas = /^locals\=(.+)$/;
	var paramLanguage = /^language\=(.+)$/;
	var scriptElems = doc.getElementsByTagName('script');
	var loc;
	for (var j = scriptElems.length - 1; j >= 0; --j)
	{
		var elem = scriptElems[j];
		var scriptSrc = decodeURIComponent(elem.src);  // sometimes the URL is escaped, ',' becomes '%2C'(e.g. in Moodle)
		if (scriptSrc)
		{
			var matchResult = scriptSrc.match(entranceSrc);
			if (matchResult)
			{
				var pstr = matchResult[2];
				if (pstr)
					pstr = pstr.substr(1);  // eliminate starting '?'
				var result = {
					'src': scriptSrc,
					'path': matchResult[1],
					'paramStr': pstr,
					'useMinFile': true
				};

				if (result.paramStr)  // analysis params
				{
					var modules;
					var params = result.paramStr.split('&');
					for (var i = 0, l = params.length; i < l; ++i)
					{
						// check min file usage
						var minFileMatch = params[i].match(paramMinFile);
						if (minFileMatch)
						{
							var pvalue = minFileMatch[1].toLowerCase();
							var value = ['false', 'no', 'f', 'n'].indexOf(pvalue) < 0;
							//var value = (pvalue === 'false') || (pvalue === 'f') || (pvalue === 'no') || (pvalue === 'n');
							//var value = ['true', 'yes', 't', 'y'].indexOf(pvalue) >= 0;
							result.useMinFile = value;
							continue;
						}
						// check module param
						var moduleMatch = params[i].match(paramModules);
						if (moduleMatch)
						{
							var moduleStr = moduleMatch[1];
							var modules = moduleStr.split(',');
							continue;
						}
						// force dom loader
						var forceDomLoaderMatch = params[i].match(paramForceDomLoader);
						if (forceDomLoaderMatch)
						{
							var pvalue = forceDomLoaderMatch[1].toLowerCase();
							var value = ['false', 'no', 'f', 'n'].indexOf(pvalue) < 0;
							result.forceDomLoader = value;
							continue;
						}
						// check required local data
						var localsMatch = params[i].match(paramLocalDatas);
						if (localsMatch)
						{
							var localsStr = localsMatch[1];
							var locals = localsStr.split(',');
							result.locals = locals;
							continue;
						}
						// language
						var forceLanguage = params[i].match(paramLanguage);
						if (forceLanguage)
						{
							var pvalue = forceLanguage[1];
							result.language = pvalue;
							continue;
						}
					}
					if (modules)
						result.modules = modules;
					else
						result.modules = usualModules;  // no modules appointed, use default setting

					// handle local data
					if (!result.locals)
						result.locals = defaultLocals;
					if (result.locals || result.language)
					{
						var localNames = [].concat(result.locals || []);
						if (result.language && localNames.indexOf(result.language) < 0)  // local resources of forced language should always be loaded
						{
							localNames.push(result.language);
						}
						if (localNames.length)
						{
							var localizationModuleIndex = result.modules.indexOf('localizationData');
							if (localizationModuleIndex < 0)  // local data module not listed, put local data as first module
								localizationModuleIndex = -1;
							for (var i = 0, l = localNames.length; i < l; ++i)
							{
								var localName = localNames[i];
								if (localName === 'en')  // default local resource, already be loaded, by pass
									continue;
								// insert resources, right after localization module, before other widget modules
								result.modules.splice(localizationModuleIndex + 1, 0, 'localizationData.' + localName);
							}
						}
					}
				}

				return result;
			}
		}
	}
	//return null;
	return {
		'src': '',
		'path': '',
		'modules': usualModules,
		//'useMinFile': false  // for debug
		'useMinFile': true
	}; // return a default setting
}

function init()
{
	var scriptInfo, files, path;
	if (isNode)
	{
		scriptInfo = {
			'src': this.__filename || '',
			'path': __dirname + '/',
			'modules': nodeModules,
			//'useMinFile': false  // for debug
			'useMinFile': true
		};
	}
	else  // in browser
	{
		scriptInfo = analysisEntranceScriptSrc(document);
	}

	files = getEssentialFiles(scriptInfo.modules, scriptInfo.useMinFile);
	path = scriptInfo.path;

	var scriptUrls = [];
	for (var i = 0, l = files.length; i < l; ++i)
	{
		scriptUrls.push(path + files[i]);
	}
	scriptUrls.push(path + 'Che.loaded.js');  // manually add small file to indicate the end of Che loading

	// save loaded module and file information
	scriptInfo.files = files;
	scriptInfo.allModuleStructures = CheFiles;
	$root['__$Che_load_info__'] = scriptInfo;
	$root['__$Che_scriptfile_utils__'] = {
		'appendScriptFile': appendScriptFile,
		'appendScriptFiles': appendScriptFiles
	};

	loadChildScriptFiles(scriptUrls, scriptInfo.forceDomLoader, function(){
		if (isNode)  // export Che namespace
		{
			// export Che in module
			exports.Che = this.Che || __nodeContext.Che;
			exports.Class = this.Class || __nodeContext.Class;
			exports.ClassEx = this.ClassEx || __nodeContext.ClassEx;
			exports.ObjectEx = this.ObjectEx || __nodeContext.ObjectEx;
			exports.DataType = this.DataType || __nodeContext.DataType;
			// and these common vars in global
			this.Class = exports.Class;
			this.ClassEx = exports.ClassEx;
			this.ObjectEx = exports.ObjectEx;
			this.DataType = exports.DataType;
		}
	});
}

init();

})(this);
