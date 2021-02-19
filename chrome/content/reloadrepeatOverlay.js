/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the 'License'); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Initial Developer of the Original Code is Jaap Haitsma.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * by the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): Jaap Haitsma <jaap@haitsma.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the 'GPL'), or
 * the GNU Lesser General Public License Version 2.1 or later (the 'LGPL'),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
var reloadrepeat = {
 prefs: null,
 tabID: 0,
 tabAdded: function(evt)
 {
  var newTab = gBrowser.getBrowserForTab(evt.target);
  if (typeof newTab.reloadRepeatEnabled === 'undefined')
   reloadrepeat.setupTab(newTab);
 },
 init: function()
 {
  reloadrepeat.prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('extensions.reloadrepeat.');
  try
  {
   var rrTime = reloadrepeat.prefs.getIntPref('reload_time');
   if (rrTime < 1)
    reloadrepeat.prefs.clearUserPref('reload_time');
  }
  catch(e)
  {
   reloadrepeat.prefs.clearUserPref('reload_time');
  }
  try
  {
   reloadrepeat.prefs.getBoolPref('reload_new_tabs');
  }
  catch(e)
  {
   reloadrepeat.prefs.clearUserPref('reload_new_tabs');
  }
  if (reloadrepeat.prefs.getBoolPref('reload_new_tabs'))
   reloadrepeat.setupTab(getBrowser().mCurrentBrowser);
  try
  {
   reloadrepeat.prefs.getIntPref('custom_reload_time');
  }
  catch(e)
  {
   reloadrepeat.prefs.clearUserPref('custom_reload_time');
  }
  try
  {
   reloadrepeat.prefs.getBoolPref('randomize');
  }
  catch(e)
  {
   reloadrepeat.prefs.clearUserPref('randomize');
  }
  try
  {
   document.getElementById('contentAreaContextMenu').addEventListener('popupshowing', function() {reloadrepeat.contextPopup();}, false);
   document.getElementById('tabContextMenu').addEventListener('popupshowing', function() {reloadrepeat.tabPopup();}, false);
   gURLBar.addEventListener('keypress', function() {reloadrepeat.onKeyPressInURLBar();}, false);
   gBrowser.tabContainer.addEventListener('TabOpen', function (evt) {reloadrepeat.tabAdded(evt);}, false);
  }
  catch(e) {}
 },
 getCurTab: function()
 {
  return getBrowser().mCurrentBrowser;
 },
 setupTab: function(tab)
 {
  tab.reloadRepeatEnabled = false;
  tab.reloadRepeatReloadTime = reloadrepeat.prefs.getIntPref('reload_time');
  if (tab.reloadRepeatReloadTime < 1)
  {
   reloadrepeat.prefs.clearUserPref('reload_time');
   tab.reloadRepeatReloadTime = 10;
  }
  tab.reloadRepeatTimerID = null;
  tab.postDataAcceptedByUser = false;
  tab.randomize = reloadrepeat.prefs.getBoolPref('randomize');
  tab.id = 'ActiveReloadTab' + reloadrepeat.tabID;
  reloadrepeat.tabID++;
  if (reloadrepeat.prefs.getBoolPref('reload_new_tabs'))
   reloadrepeat.enable(tab);
  tab.reloadRepeatProgressListener = reloadrepeat.progressListener(tab);
 },
 showPopupMenu: function(prefix)
 {
  if (typeof getBrowser().mCurrentBrowser.reloadRepeatEnabled === 'undefined')
   reloadrepeat.setupTab(getBrowser().mCurrentBrowser);
  document.getElementById(prefix + '_enable').setAttribute('checked', getBrowser().mCurrentBrowser.reloadRepeatEnabled ? 'true' : 'false');
  document.getElementById(prefix + '_randomize').setAttribute('checked', getBrowser().mCurrentBrowser.randomize ? 'true' : 'false');
  document.getElementById(prefix + '_auto_new_tabs').setAttribute('checked', reloadrepeat.prefs.getBoolPref('reload_new_tabs') ? 'true' : 'false');
  document.getElementById(prefix + '_5s').setAttribute('checked', 'false');
  document.getElementById(prefix + '_10s').setAttribute('checked', 'false');
  document.getElementById(prefix + '_30s').setAttribute('checked', 'false');
  document.getElementById(prefix + '_1m').setAttribute('checked', 'false');
  document.getElementById(prefix + '_5m').setAttribute('checked', 'false');
  document.getElementById(prefix + '_15m').setAttribute('checked', 'false');
  document.getElementById(prefix + '_custom').setAttribute('checked', 'false');
  var rrTime = getBrowser().mCurrentBrowser.reloadRepeatReloadTime;
  if (rrTime < 1)
  {
   getBrowser().mCurrentBrowser.reloadRepeatEnabled = false;
   document.getElementById(prefix + '_enable').setAttribute('checked', 'false');
   reloadrepeat.prefs.clearUserPref('reload_time');
   return;
  }
  switch (rrTime)
  {
   case 5:
    document.getElementById(prefix + '_5s').setAttribute('checked', 'true');
    break;
   case 10:
    document.getElementById(prefix + '_10s').setAttribute('checked', 'true');
    break;
   case 30:
    document.getElementById(prefix + '_30s').setAttribute('checked', 'true');
    break;
   case 60:
    document.getElementById(prefix + '_1m').setAttribute('checked', 'true');
    break;
   case 5 * 60:
    document.getElementById(prefix + '_5m').setAttribute('checked', 'true');
    break;
   case 15 * 60:
    document.getElementById(prefix + '_15m').setAttribute('checked', 'true');
    break;
   default:
    document.getElementById(prefix + '_custom').setAttribute('checked', 'true');
  }
 },
 contextPopup: function()
 {
  var cm = gContextMenu;
  var hidden = cm.isTextSelected || cm.onLink || cm.onImage || cm.onTextInput;
  document.getElementById('reloadrepeat_menu').hidden = hidden;
  if (!hidden)
   reloadrepeat.showPopupMenu('reloadrepeat');
 },
 tabPopup: function()
 {
  reloadrepeat.showPopupMenu('tab_reloadrepeat');
 },
 reloadPage: function (reloadRepeatTabID)
 {
  var tab = document.getElementById(reloadRepeatTabID);
  if (tab === null)
   return;
  if (tab.reloadRepeatEnabled === false)
  {
   tab.postDataAcceptedByUser = false;
   return;
  }
  var loadFlags = tab.webNavigation.LOAD_FLAGS_BYPASS_HISTORY | tab.webNavigation.LOAD_FLAGS_BYPASS_PROXY | tab.webNavigation.LOAD_FLAGS_BYPASS_CACHE;
  var entry = tab.webNavigation.sessionHistory.getEntryAtIndex(tab.webNavigation.sessionHistory.index, false);
  var postData = entry.QueryInterface(Components.interfaces.nsISHEntry).postData;
  var referrer = entry.QueryInterface(Components.interfaces.nsISHEntry).referrerURI;
  if ((postData !== null) && (tab.postDataAcceptedByUser === false))
  {
   var params = {result: null};
   window.openDialog('chrome://reloadrepeat/content/warnPostData.xul', '', 'chrome,centerscreen,modal', params);
   if (params.result)
    tab.postDataAcceptedByUser = true;
   else
   {
    tab.reloadRepeatEnabled = false;
    return;
   }
  }
  tab.curScrollX = tab.contentWindow.scrollX;
  tab.curScrollY = tab.contentWindow.scrollY;
  var notifyFlags = Components.interfaces.nsIWebProgress.NOTIFY_ALL;
  tab.webProgress.addProgressListener(tab.reloadRepeatProgressListener, notifyFlags);
  tab.webNavigation.loadURI(tab.webNavigation.currentURI.spec, loadFlags, referrer, entry.postData, null);
 },
 reloadRepeat: function(tab)
 {
  if (tab.reloadRepeatReloadTime < 1)
  {
   reloadrepeat.prefs.clearUserPref('reload_time');
   tab.reloadRepeatReloadTime = 10;
  }
  var milliSeconds = tab.reloadRepeatReloadTime * 1000;
  if (tab.randomize)
   milliSeconds = (Math.random() + 0.5) * milliSeconds;
  return setTimeout('reloadrepeat.reloadPage(\'' + tab.id + '\');', milliSeconds);
 },
 enable: function(tab)
 {
  tab.reloadRepeatEnabled = true;
  clearInterval(tab.reloadRepeatTimerID);
  tab.reloadRepeatTimerID = reloadrepeat.reloadRepeat(tab);
 },
 disable: function(tab)
 {
  clearInterval(tab.reloadRepeatTimerID);
  tab.reloadRepeatEnabled = false;
  tab.postDataAcceptedByUser = false;
 },
 toggle: function()
 {
  var tab = getBrowser().mCurrentBrowser;
  if (tab.reloadRepeatEnabled)
   reloadrepeat.disable(tab);
  else
   reloadrepeat.enable(tab);
 },
 randomize: function()
 {
  var tab = getBrowser().mCurrentBrowser;
  tab.randomize = !tab.randomize;
  reloadrepeat.prefs.setBoolPref('randomize', tab.randomize);
 },
 setReloadTime: function(reloadTime)
 {
  if (reloadTime < 1)
  {
   reloadrepeat.prefs.clearUserPref('reload_time');
   reloadTime = 10;
  }
  getBrowser().mCurrentBrowser.reloadRepeatReloadTime = reloadTime;
  reloadrepeat.prefs.setIntPref('reload_time', reloadTime);
  reloadrepeat.enable(getBrowser().mCurrentBrowser);
 },
 setReloadTimeCustom: function()
 {
  var params = {result: null};
  window.openDialog('chrome://reloadrepeat/content/reloadrepeatCustomDialog.xul', '', 'chrome,centerscreen,modal', params);
  if (params.result)
  {
   var reloadTime = reloadrepeat.prefs.getIntPref('custom_reload_time');
   if (reloadTime < 1)
   {
    reloadrepeat.prefs.clearUserPref('reload_time');
    alert('Invalid reload time: ' + reloadTime + 's');
    return;
   }
   getBrowser().mCurrentBrowser.reloadRepeatReloadTime = reloadTime;
   reloadrepeat.enable(getBrowser().mCurrentBrowser);
  }
 },
 customDialogLoadSettings: function()
 {
  reloadrepeat.prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('extensions.reloadrepeat.');
  var customReloadTime = reloadrepeat.prefs.getIntPref('custom_reload_time');
  document.getElementById('reload_repeat_minutes').value = Math.floor(customReloadTime / 60);
  document.getElementById('reload_repeat_seconds').value = customReloadTime % 60;
 },
 customDialogSaveSettings: function()
 {
  var minutes = 0;
  if (document.getElementById('reload_repeat_minutes').value !== '')
   minutes = parseInt(document.getElementById('reload_repeat_minutes').value);
  var seconds = 0;
  if (document.getElementById('reload_repeat_seconds').value !== '')
   seconds = parseInt(document.getElementById('reload_repeat_seconds').value);
  var customReloadTime = minutes * 60 + seconds;
  reloadrepeat.prefs.setIntPref('custom_reload_time', customReloadTime);
  reloadrepeat.prefs.setIntPref('reload_time', customReloadTime);
  return true;
 },
 enableAllTabs: function()
 {
  for (var i = 0; i < getBrowser().browsers.length; i++)
  {
   var tab = getBrowser().browsers[i];
   if (typeof tab.reloadRepeatEnabled === 'undefined')
    reloadrepeat.setupTab(tab);
   if (tab.reloadRepeatEnabled !== true)
    reloadrepeat.enable(tab);
  }
 },
 disableAllTabs: function()
 {
  for (var i = 0; i < getBrowser().browsers.length; i++)
  {
   var tab = getBrowser().browsers[i];
   if (tab.reloadRepeatEnabled === true)
    reloadrepeat.disable(tab);
  }
 },
 autoNewTabsToggle: function()
 {
  if (reloadrepeat.prefs.getBoolPref('reload_new_tabs'))
   reloadrepeat.prefs.setBoolPref('reload_new_tabs', false);
  else
   reloadrepeat.prefs.setBoolPref('reload_new_tabs', true);
 },
 onKeyPressInURLBar: function()
 {
  if (getBrowser().mCurrentBrowser.reloadRepeatEnabled)
  {
   getBrowser().mCurrentBrowser.reloadRepeatEnabled = false;
   getBrowser().mCurrentBrowser.postDataAcceptedByUser = false;
   clearInterval(getBrowser().mCurrentBrowser.reloadRepeatTimerID);
  }
 },
 progressListener: function (tab)
 {
  return(
   {
    QueryInterface: function(aIID)
    {
     if (aIID.equals(Components.interfaces.nsIWebProgressListener) || aIID.equals(Components.interfaces.nsISupportsWeakReference) || aIID.equals(Components.interfaces.nsISupports))
      return this;
     throw Components.results.NS_NOINTERFACE;
    },
    onProgressChange: function() {},
    onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus)
    {
     if ((aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW) && (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP))
     {
      tab.webProgress.removeProgressListener(tab.reloadRepeatProgressListener);
      tab.contentWindow.scrollTo(tab.curScrollX, tab.curScrollY);
      if (tab.reloadRepeatEnabled)
       tab.reloadRepeatTimerID = reloadrepeat.reloadRepeat(tab);
     }
    },
    onLocationChange: function() {},
    onStatusChange: function() {},
    onSecurityChange: function() {}
   }
  );
 }
};
window.addEventListener('load',function() {reloadrepeat.init();}, false);
