Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    items: [
        {
        xtype: 'container',
        itemId: 'filter-Box', 
        layout: {
            type: 'hbox',
            align: 'stretch'
            }
        }
    ],

    launch: function() {
        var app = this;

        app._getReportType();

        app._setReleaseDate();

//        if (app.getSetting("type") !== "")  {
//            app._loadData();
//        } 
    },

    getSettingsFields: function() {
        var values = [
            {
                name: 'type',
                xtype: 'rallytextfield',
                label : "Defects or Test Cases"
            }
        ];

        return values;
    },

    _getReportType: function() {
        var app = this;
        console.log("here");

		var reportOptions = Ext.create('Ext.data.Store', {
    		fields: ['abbr', 'name'],
    		data : [
       			{"abbr":"Defect", "name":"Defects"},
        		{"abbr":"TestCase", "name":"Test Cases"}
	    		]
		});

		// Create the combo box, attached to the states data store
		var reportTypeField = Ext.create('Ext.form.ComboBox', {
    		itemId: 'type-Filter',
    		fieldLabel: 'Choose Report',
    		store: reportOptions,
    		queryMode: 'local',
    		forceSelection: 'true',
    		displayField: 'name',
    		valueField: 'abbr',
    		renderTo: Ext.getBody()
		});
        app.down('#filter-Box').add(reportTypeField);
    },

    _setReleaseDate: function() {
        var app = this; 

        var d = Ext.Date.add(new Date(), Ext.Date.DAY, 0);
        app.startDate = Ext.Date.clearTime(d);

        var releaseDateField = Ext.create('Ext.Container', {
            items: [{
                itemId: 'release-Date',
                xtype: 'rallydatefield',
                fieldLabel: 'Release Date',
                labelAlign: 'right',
                listeners: {
                    select: app._loadData,
                    scope: app
                    },                   
                value: app.startDate
            }],
            renderTo: Ext.getBody().dom
        });

        app.down('#filter-Box').add(releaseDateField);
    },

    _loadData: function() {
        var app = this;

        app.reportType = app.down('#type-Filter').getValue();
        console.log(app.reportType);
        app.releaseDate = app.down('#release-Date').getValue();
        console.log(app.releaseDate);

        var storyFilter = app._setStoryFilter(app.releaseDate);

        app.itemStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'User Story',
            autoLoad: true,
            filters: storyFilter,
            limit: Infinity, 
            listeners: {
                load: function(myStore, myData, success) {
                    app._processStories();
//                    app._drawPieChart();
                },
                scope: app    
            },
            fetch: ['FormattedID','ObjectID', 'Name', 'c_ReleaseDate']
        });
    },

    _setStoryFilter: function(rDate) {

    	console.log(rDate);

    	var rFilter1 = Ext.create('Rally.data.wsapi.Filter', {
            property: 'c_ReleaseDate',
            operator: '>=',
            value: rDate
        });

        var d = Ext.Date.add(rDate, Ext.Date.DAY, +1);
        console.log(d);

        var rFilter2 = Ext.create('Rally.data.wsapi.Filter', {
            property: 'c_ReleaseDate',
            operator: '<',
            value: d
        });

        return rFilter1.and(rFilter2);
    },

    _processStories: function() {
        var app = this;

//        app._createArrayStore();

        app.itemStore.each(function(record) {
            var item = record.get('ObjectID');
            var id = record.get('FormattedID');
            var name = record.get('Name');
            var rdate = record.get('c_ReleaseDate');

        	console.log(item, id, name, rdate);
        });

    },

    _getPointsDifference: function(objid, uDate) {
        var app = this;
        var deferred = Ext.create('Deft.Deferred');

        var uStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,
            listeners: {
                scope: app,
                load: function(uStore, uData, success) {
                    if (uStore.getCount() === 0) {
                        deferred.resolve(0);
                    } else {
                        uStore.each(function(record) {
                            var points = record.get('AcceptedLeafStoryPlanEstimateTotal');
                            deferred.resolve(points);
                        }, app);
                    }
                }
            },
            fetch: ['Name', 'AcceptedLeafStoryPlanEstimateTotal'],
            filters: [
                {
                    property: 'ObjectID',
                    operator: '=',
                    value: objid
                },
                {
                    property: '__At',
                    value: uDate
                }
            ]
        });
        return deferred.promise;
    },

    _createArrayStore: function() {
        var app = this;

        if (app.pointsStore) {
            app.pointsStore.removeAll();
        } else {
            app.pointsStore = new Ext.data.ArrayStore({
                fields: [
                    'FormattedID',
                    'Name',
                    'Start',
                    'End',
                    'Points'
                ]
            });
        }    
    },

    _createPointsGrid: function() {
        var app = this;

        if(!app.pointsGrid) {
            app.pointsGrid = new Ext.grid.Panel({
                store: app.pointsStore,
                width: Ext.getBody().getViewSize().width,
                columns: [
                    {text: 'ID',        dataIndex: 'FormattedID'},       
                    {text: 'Name',      dataIndex: 'Name',   flex:1},
                    {text: 'Start',     dataIndex: 'Start'},
                    {text: 'End',       dataIndex: 'End'},
                    {text: 'Points',    dataIndex: 'Points'}
                ],
                renderTo: Ext.getBody()
                });

            Ext.EventManager.onWindowResize(function () {
                var width = Ext.getBody().getViewSize().width;
                app.pointsGrid.setWidth(width);
            });
            
            app.add(app.pointsGrid);
        }
    },

    _drawPieChart: function() {
        var app = this;

        if(!app.pieChart) {
            app.pieChart = new Ext.chart.Chart({
                width: Ext.getBody().getViewSize().width,
                height: Ext.getBody().getViewSize().height - 20,
                animate: true,
                store: app.pointsStore,
                renderTo: Ext.getBody(),
                shadow: true,
//                legend: {
//                    position: 'right'
//                },
                insetPadding: 25,
                theme: 'Base:gradients',
                series: [{
                    type: 'pie',
                    field: 'Points',
//                    showInLegend: true,
                    tips: {
                        trackMouse: true,
                        width: 300,
                        height: 29,
                        bodyStyle: {background: 'white'},
                        renderer: function(storeItem, item) {
                            var total = 0;
                            app.pointsStore.each(function(rec) {
                                total += rec.get('Points');
                            });
                            this.setTitle(storeItem.get('Name') + ': ' + Math.round(storeItem.get('Points') / total * 100) + '%');
                        }
                    },
                    highlight: {
                        segment: {
                            margin: 20
                        }
                    },
                    label: {
                        field: 'Name'
//                        display: 'rotate',
//                        font: '8px Arial'
                    },
                    animate: true
                }]
            });

            Ext.EventManager.onWindowResize(function () {
                var width = Ext.getBody().getViewSize().width;
                var height = Ext.getBody().getViewSize().height - 20;
                app.pieChart.setSize(width, height);
            });

            app.add(app.pieChart);
        }
    } 
});