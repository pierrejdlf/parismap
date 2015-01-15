module.exports = function(grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    env : {
      options : {
          /* Shared Options Hash */
          //globalOption : 'foo'
      },
      dev: {
        NODE_ENV : 'DEVELOPMENT'
      },
      prod : {
        NODE_ENV : 'PRODUCTION'
      }
    },

    less: {
      prod: {
        options: {
          paths: ["assets"]
        },
        files: {
          "src/css/style.css": "src/css/style.less",
          "src/css/emi.css": "src/css/emi.less"
        }
      }
    },

    concat: {
      options: {
        separator: '\n\n'
      },
      build_css: {
        src: [
          'src/vendor/leaflet/leaflet.css',
          'src/vendor/leaflet.locatecontrol/src/L.Control.Locate.css',
          'src/vendor/leaflet.fullscreen/carte/leaflet.fullscreen.css',
          'src/vendor/font-awesome/css/font-awesome.css',
          'src/css/*.css'
        ],
        dest: 'carte/css/<%= pkg.name %>.css'
      },
      dist: {
        src: [
          'src/vendor/underscore/underscore-min.js',
          'src/vendor/zepto/src/zepto.js',
          'src/vendor/zepto/src/event.js',
          'src/vendor/zepto/src/ajax.js',
          'src/vendor/handlebars/handlebars.js',
          'src/vendor/leaflet/leaflet.js',
          'src/vendor/leaflet.bouncemarker/bouncemarker.js',
          'src/vendor/leaflet.locatecontrol/src/L.Control.Locate.js',
          'src/vendor/leaflet.markercluster/dist/leaflet.markercluster.js',
          'src/vendor/leaflet.fullscreen/dist/Leaflet.fullscreen.min.js',
          'src/vendor/moment/moment.js',
          'src/js/plouf.js'
        ],
        dest: 'carte/js/<%= pkg.name %>.js'
      }
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'carte/js/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },

    copy: {
        dist: {
            files: [
                {
                    expand: true,
                    flatten: true,
                    src: [
                        'src/vendor/font-awesome/fonts/**'
                    ],
                    dest: 'carte/fonts/',
                    filter: 'isFile'
                },
                {
                    expand: true,
                    flatten: true,
                    src: [
                        'src/vendor/leaflet.locatecontrol/src/images/**'
                    ],
                    dest: 'carte/css/images/',
                    filter: 'isFile'
                },
                {
                    expand: true,
                    flatten: true,
                    src: [
                        'src/vendor/leaflet.fullscreen/dist/fullscreen*'
                    ],
                    dest: 'carte/css/',
                    filter: 'isFile'
                },
                {
                    expand: true,
                    flatten: true,
                    src: [
                        'src/vendor/font-awesome/css/**'
                    ],
                    dest: 'carte/css/',
                    filter: 'isFile'
                },
                {
                    expand: true,
                    flatten: true,
                    src: ['src/js/loader_example.js'],
                    dest: 'carte/js/',
                    filter: 'isFile'
                }
            ]
        }
    },

    preprocess : {
      dev : {
        src : './src/tmpl/index.html',
        dest : './dev/index.html'
      },
      prod : {
        src : './src/index.html',
        dest : 'carte/index.html'
      },
      config : {
        src : './src/config.xml',
        dest : 'carte/config.xml'
      },
      icon : {
        src : './src/icon.png',
        dest : 'carte/icon.png'
      }
    },

    jshint: {
      files: ['Gruntfile.js', 'src/plouf.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        }
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint', 'qunit']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy' );
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-preprocess');
  //grunt.loadNpmTasks('grunt-contrib-less');

  grunt.registerTask('default', ['jshint','env:prod','less:prod','concat','concat:build_css','copy','uglify','preprocess:prod','preprocess:config','preprocess:icon']);

};
