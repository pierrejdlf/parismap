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

    concat: {
      options: {
        separator: ';'
      },
      build_css: {
        src: [
          'vendor/leaflet/leaflet.css',
          'vendor/leaflet.locatecontrol/src/L.Control.Locate.css',
          'vendor/leaflet.markercluster/dist/MarkerCluster.css',
          //'vendor/leaflet-font-awesome/dist/leaflet.awesome-markers.css',
          //'vendor/font-awesome/css/font-awesome.css',
          'vendor/swiper/dist/idangerous.swiper.css',
          'src/css/style.css'
        ],
        dest: 'dist/css/<%= pkg.name %>.css'
      },
      dist: {
        src: [
          'vendor/underscore/underscore-min.js',
          'vendor/zepto/src/zepto.js',
          'vendor/zepto/src/event.js',
          'vendor/zepto/src/ajax.js',
          'vendor/handlebars/handlebars.js',
          'vendor/leaflet/leaflet.js',
          'vendor/leaflet.bouncemarker/bouncemarker.js',
          'vendor/leaflet.locatecontrol/src/L.Control.Locate.js',
          'vendor/leaflet.markercluster/dist/leaflet.markercluster.js',
          //'vendor/leaflet-font-awesome/dist/leaflet.awesome-markers.js',
          'vendor/swiper/dist/idangerous.swiper-2.4.js',
          'vendor/swiper/plugins/smooth-progress/idangerous.swiper.progress.js',
          'vendor/moment/moment.js',
          'src/**/*.js'
        ],
        dest: 'dist/js/<%= pkg.name %>.js'
      }
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/js/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
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
                        'vendor/font-awesome/fonts/**'
                    ],
                    dest: 'dist/fonts/',
                    filter: 'isFile'
                },
                {
                    expand: true,
                    flatten: true,
                    src: [ 
                        'vendor/leaflet.locatecontrol/src/images/**'
                    ],
                    dest: 'dist/css/images/',
                    filter: 'isFile'
                },
                {
                    expand: true,
                    flatten: true,
                    src: [ 
                        'vendor/font-awesome/css/**'
                    ],
                    dest: 'dist/css/',
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
        dest : 'dist/index.html'
      },
      config : {
        src : './src/config.xml',
        dest : 'dist/config.xml'
      },
      icon : {
        src : './src/icon.png',
        dest : 'dist/icon.png'
      }
    },

    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
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
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-preprocess');
  //grunt.loadNpmTasks('grunt-contrib-less');

  grunt.registerTask('default', ['jshint','env:prod','concat','concat:build_css','copy','uglify','preprocess:prod','preprocess:config','preprocess:icon']);

};