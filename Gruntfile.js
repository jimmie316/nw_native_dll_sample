/*jshint camelcase: false*/

module.exports = function (grunt) {
  'use strict';

  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // configurable paths
  var config = {
    app: 'app',
    dist: 'dist',
    tmp: 'tmp',
    resources: 'resources'
  };

  function nw_gyp(mod) {
    return [
      'rm -rf ' + mod,
      'npm install ' + mod,
      'cd node_modules/' + mod,
      'nw-gyp rebuild --target=0.8.5',
    ].join('&&')
  }

  grunt.initConfig({
    config: config,
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '<%= config.dist %>/*',
            '<%= config.tmp %>/*'
          ]
        }]
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      files: '<%= config.app %>/js/*.js'
    },
    copy: {
      bower: {
        files: [{
          expand: true,
          cwd: 'bower_components/jquery/dist',
          dest: '<%= config.app %>/js/lib',
          src: ['jquery.min.js', 'jquery.min.map']
        }]
      },
      appLinux: {
        files: [{
          expand: true,
          cwd: '<%= config.app %>',
          dest: '<%= config.dist %>/app.nw',
          src: '**'
        }]
      },
      appMacos: {
        files: [{
          expand: true,
          cwd: '<%= config.app %>',
          dest: '<%= config.dist %>/node-webkit.app/Contents/Resources/app.nw',
          src: '**'
        }, {
          expand: true,
          cwd: '<%= config.resources %>/mac/',
          dest: '<%= config.dist %>/node-webkit.app/Contents/',
          filter: 'isFile',
          src: '*.plist'
        }, {
          expand: true,
          cwd: '<%= config.resources %>/mac/',
          dest: '<%= config.dist %>/node-webkit.app/Contents/Resources/',
          filter: 'isFile',
          src: '*.icns'
        }]
      },
      webkit: {
        files: [{
          expand: true,
          cwd: '<%=config.resources %>/node-webkit/MacOS',
          dest: '<%= config.dist %>/',
          src: '**'
        }]
      },
      copyWinToTmp: {
        files: [{
          expand: true,
          cwd: '<%= config.resources %>/node-webkit/Windows/',
          dest: '<%= config.tmp %>/',
          src: '**'
        }]
      }
    },
    shell: {
      install_ffi: {
        command: nw_gyp('ffi'),
        options: { stdout: true, stderr: true}
      },
      install_ref: {
        command: nw_gyp('ref'),
        options: { stdout: true, stderr: true}
      },
      install_dlls_to_dist_mac: {
        command: 'cp -a dlls <%= config.dist %>/node-webkit.app/Contents/Resources/app.nw',
        options: { stdout: true, stderr: true, expand: true}        
      },
      install_ref_and_ffi_to_dist_mac: {
        command: 'mkdir -p <%= config.dist %>/node-webkit.app/Contents/Resources/app.nw/node_modules && cp -a node_modules/ref node_modules/ffi <%= config.dist %>/node-webkit.app/Contents/Resources/app.nw/node_modules',
        options: { stdout: true, stderr: true, expand: true}        
      }
    },
    compress: {
      appToTmp: {
        options: {
          archive: '<%= config.tmp %>/app.zip'
        },
        files: [{
          expand: true,
          cwd: '<%= config.app %>',
          src: ['**']
        }, {
          expand: true,
          cwd: '',
          src: ['dlls/*', 'node_modules/ref/**', 'node_modules/ffi/**']
        }]
      },
      finalWindowsApp: {
        options: {
          archive: '<%= config.dist %>/nw-dll-sample.zip'
        },
        files: [{
          expand: true,
          cwd: '<%= config.tmp %>',
          src: ['**']
        }]
      }
    },
    rename: {
      app: {
        files: [{
          src: '<%= config.dist %>/node-webkit.app',
          dest: '<%= config.dist %>/nw-dll-sample.app'
        }]
      },
      zipToApp: {
        files: [{
          src: '<%= config.tmp %>/app.zip',
          dest: '<%= config.tmp %>/app.nw'
        }]
      }
    }
  });

  grunt.registerTask('chmod', 'Add lost Permissions.', function () {
    var fs = require('fs');
    fs.chmodSync('dist/nw-dll-sample.app/Contents/Frameworks/node-webkit Helper EH.app/Contents/MacOS/node-webkit Helper EH', '555');
    fs.chmodSync('dist/nw-dll-sample.app/Contents/Frameworks/node-webkit Helper NP.app/Contents/MacOS/node-webkit Helper NP', '555');
    fs.chmodSync('dist/nw-dll-sample.app/Contents/Frameworks/node-webkit Helper.app/Contents/MacOS/node-webkit Helper', '555');
    fs.chmodSync('dist/nw-dll-sample.app/Contents/MacOS/node-webkit', '555');
  });

  grunt.registerTask('createLinuxApp', 'Create linux distribution.', function () {
    var done = this.async();
    var childProcess = require('child_process');
    var exec = childProcess.exec;
    exec('mkdir -p ./dist; cp resources/node-webkit/linux_ia64/nw.pak dist/ && cp resources/node-webkit/linux_ia64/nw dist/node-webkit', function (error, stdout, stderr) {
      var result = true;
      if (stdout) {
        grunt.log.write(stdout);
      }
      if (stderr) {
        grunt.log.write(stderr);
      }
      if (error !== null) {
        grunt.log.error(error);
        result = false;
      }
      done(result);
    });
  });

  grunt.registerTask('createWindowsApp', 'Create windows distribution.', function () {
    var done = this.async();
    var childProcess = require('child_process');
    var exec = childProcess.exec;
    exec('copy /b tmp\\nw.exe+tmp\\app.nw tmp\\nw-dll-sample.exe && del tmp\\app.nw tmp\\nw.exe', function (error, stdout, stderr) {
      var result = true;
      if (stdout) {
        grunt.log.write(stdout);
      }
      if (stderr) {
        grunt.log.write(stderr);
      }
      if (error !== null) {
        grunt.log.error(error);
        result = false;
      }
      done(result);
    });
  });

  grunt.registerTask('setVersion', 'Set version to all needed files', function (version) {
    var config = grunt.config.get(['config']);
    var appPath = config.app;
    var resourcesPath = config.resources;
    var mainPackageJSON = grunt.file.readJSON('package.json');
    var appPackageJSON = grunt.file.readJSON(appPath + '/package.json');
    var infoPlistTmp = grunt.file.read(resourcesPath + '/mac/Info.plist.tmp', {
      encoding: 'UTF8'
    });
    var infoPlist = grunt.template.process(infoPlistTmp, {
      data: {
        version: version
      }
    });
    mainPackageJSON.version = version;
    appPackageJSON.version = version;
    grunt.file.write('package.json', JSON.stringify(mainPackageJSON, null, 2), {
      encoding: 'UTF8'
    });
    grunt.file.write(appPath + '/package.json', JSON.stringify(appPackageJSON, null, 2), {
      encoding: 'UTF8'
    });
    grunt.file.write(resourcesPath + '/mac/Info.plist', infoPlist, {
      encoding: 'UTF8'
    });
  });

  grunt.registerTask('dist-linux', [
    'jshint',
    'clean:dist',
    'copy:appLinux',
    'createLinuxApp'
  ]);

  grunt.registerTask('dist-win', [
    //'jshint',
    'clean:dist',
    'copy:copyWinToTmp',
    'compress:appToTmp',
    'rename:zipToApp',
    'createWindowsApp',
    'compress:finalWindowsApp'
  ]);

  grunt.registerTask('dist-mac', [
    //'jshint',
    'clean:dist',
    'copy:webkit',
    'copy:appMacos',
    'shell:install_dlls_to_dist_mac',
    'shell:install_ref_and_ffi_to_dist_mac',
    'rename:app',
    'chmod'
  ]);

  grunt.registerTask('check', [
    'jshint'
  ]);
};