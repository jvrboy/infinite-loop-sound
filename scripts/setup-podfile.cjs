const fs = require('fs');
const lines = [
  'platform :ios, "16.0"',
  'use_frameworks! :linkage => :static',
  '',
  'target "App" do',
  '  pod "Capacitor", :path => "../../node_modules/@capacitor/ios"',
  '  pod "CapacitorCordova", :path => "../../node_modules/@capacitor/cordova"',
  '  pod "CapacitorHttp", :path => "../../node_modules/@capacitor/http"',
  '  pod "CapacitorLocalNotifications", :path => "../../node_modules/@capacitor/local-notifications"',
  'end',
  '',
];
fs.writeFileSync('ios/App/Podfile', lines.join('\n'));
console.log('Manual Podfile created');
