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

        var storyFilter = app._setStoryFilter(app.releaseDate, app.reportType);

        app.itemStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'User Story',
            autoLoad: true,
            filters: storyFilter,
            limit: Infinity, 
            listeners: {
                load: function(myStore, myData, success) {
                    app._processStories();
                },
                scope: app    
            },
            fetch: ['FormattedID','ObjectID', 'Name', 'c_ReleaseDate']
        });
    },

    _setStoryFilter: function(rDate,aType) {

    	console.log('Release Date: ', rDate, 'Report Type:', aType);

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

        var rFilter = '';

        if (aType === 'Defect') {
        	rFilter3 = Ext.create('Rally.data.wsapi.Filter', {
            	property: 'Defects.ObjectID',
            	operator: '!=',
            	value: 'null'
        	});
        } else {
            rFilter3 = Ext.create('Rally.data.wsapi.Filter', {
            	property: 'TestCases.ObjectID',
            	operator: '!=',
            	value: 'null'
        	});	
        }

        return rFilter1.and(rFilter2).and(rFilter3);
    },

    _processStories: function() {
        var app = this;

		var storyList = '';

        app.itemStore.each(function(record) {
            var item = record.get('ObjectID');
            var id = record.get('FormattedID');
            var name = record.get('Name');
            var rdate = record.get('c_ReleaseDate');

        	console.log(item, id, name, rdate);

        	storyList = app._setFilter(item, storyList);

        });

        console.log(storyList);
        app.reportStore = Ext.create('Rally.data.wsapi.Store', {
            model: app.reportType,
            autoLoad: true,
            filters: storyList,
            limit: Infinity, 
            listeners: {
                load: function(myStore, myData, success) {
                	console.log('Store Created');
                	console.log(myStore);
                    app._showGrid();
                },
                scope: app    
            },
            fetch: ['FormattedID','ObjectID', 'Name']
        });

    },

    _setFilter: function(story, cFilter) {
		console.log(story, cFilter);

    	var dFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Requirement.ObjectID',
            operator: '=',
            value: story
        });

        if(cFilter === '') {
        	return(dFilter);
        } else {
        	return(cFilter.or(dFilter));
        }
    },

    _showGrid: function() {
    	var app = this;

    	app.reportStore.each(function(record) {
            var item = record.get('ObjectID');
            var id = record.get('FormattedID');
            var name = record.get('Name');

        	console.log(item, id, name);
        });
    }
});