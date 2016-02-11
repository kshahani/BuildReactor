"use strict";

/* global __dirname: true */
var path = require("path");
var webpack = require("webpack");
var WebpackErrorNotificationPlugin = require('webpack-error-notification');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  context: path.join(__dirname, "src"),
  entry: {
    // main: path.join(__dirname + "/src/core/main.js"),
    settings: "./settings/main-app.js",
    dashboard: "./dashboard/main-app.js",
    popup: "./popup/main-app.js"
  },
  output: {
    publicPath: './',
    path: path.join(__dirname, "dist/BuildReactor"),
    filename: "[name].js",
    chunkFilename: "[id].chunk.js"
  },

  resolve: {
    modulesDirectories: ["node_modules", "bower_components/Rx/dist"],
    extensions: ['', '.js'],
    alias: {
      jquery: path.join(__dirname, "/bower_components/jquery/dist/jquery"),
      mout: path.join(__dirname, '/bower_components/mout/src'),
      angular: path.join(__dirname, "/bower_components/angular/angular"),
      bootstrap: path.join(__dirname, "/bower_components/bootstrap/js"),
      bootstrapCss: path.join(__dirname, "/bower_components/bootstrap/dist/css/bootstrap.min.css"),
      "angular.ui": path.join(__dirname, "/bower_components/angular-ui-bootstrap-bower/ui-bootstrap-tpls"),
      "angular.ui.utils": path.join(__dirname, "/bower_components/angular-ui-utils/ui-utils"),
      "angular.route": path.join(__dirname, "/bower_components/angular-route/angular-route"),
      htmlSortable: path.join(__dirname, "/bower_components/html.sortable/src/html.sortable.angular"),
      htmlSortableJquery: path.join(__dirname, '/bower_components/html.sortable/dist/html.sortable'),
      fontAwesome: path.join(__dirname, '/bower_components/font-awesome/css/font-awesome.min.css'),
    },
    root: path.join(__dirname, "src")
  },

  plugins: [
    new WebpackErrorNotificationPlugin(/* strategy */),
    new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery"
    }),
    new HtmlWebpackPlugin({
      template: './settings/index.html',
      filename: 'settings.html',
      inject: 'body',
      chunks: [ 'commons', 'settings' ],
      minify: false
    }),
    new HtmlWebpackPlugin({
      template: './popup/index.html',
      filename: 'popup.html',
      inject: 'body',
      chunks: [ 'commons', 'popup' ],
      minify: false
    }),
    new HtmlWebpackPlugin({
      template: './dashboard/index.html',
      filename: 'dashboard.html',
      inject: 'body',
      chunks: [ 'commons', 'dashboard' ],
      minify: false
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: "commons",
      filename: "commons.js",
      minChunks: 3, // Modules must be shared between 3 entries
      chunks: ["settings", "dashboard", "popup"]
    }),
    new CopyWebpackPlugin([
      { from: '../manifest.json' },
      { from: '../img', to: 'img' }
    ]),
    new ExtractTextPlugin("[name].css")
  ],

  module: {
    loaders: [
      {
        test: /\.js$/,
        include: path.join(__dirname, 'src'),
        loader: 'babel-loader',
        query: {
          presets: ["es2015"]
        }
      },
      { 
        test: /\.?css$/,
        loader: ExtractTextPlugin.extract("style-loader", "css-loader!sass-loader")
      },
      {
        test: /\.(png|jpg)$/,
        loader: "url?limit=10000&name=/img/[name].[ext]"
      },
      {
        test: /\.(svg)/,
        loader: 'url?limit=10000&name=/img/[name].[ext]'
      },
      {
        test: /\.(ttf|eot|otf|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: "file?name=/fonts/[name].[ext]" },
      {
        test: /\.html$/,
        loader: 'html'
      },
      {
        test: /jquery\.js$/,
        loader: 'expose?$!expose?jQuery'
      },
      {
        test: /[\/]angular\.js$/,
        loader: "exports?angular"
      },
      {
        test: /[\/]html.sortable.angular\.js$/,
        loader: "exports?angular.module('htmlSortable')"
      }
    ]
  },

  devServer: {
    contentBase: "./src"
  }
};