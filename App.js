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
    },

    _getReportType: function() {
        var app = this;

		var reportOptions = Ext.create('Ext.data.Store', {
            fields: ['model', 'name'],
            data : [
                {"model":"Defect", "name":"Defects"},
                {"model":"Test Case", "name":"Test Cases"}
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
            valueField: 'model',
            renderTo: Ext.getBody(),
            listeners: {
                select: app._changeType,
                scope: app
                }                
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

    _changeType: function() {
        var app = this;

        if(app.resultsGrid) {
            app.remove(app.resultsGrid);
            app.resultsGrid = null;
        }

        app._loadData();
    },

    _loadData: function() {
        var app = this;

        app.reportType = app.down('#type-Filter').getValue();
        app.releaseDate = app.down('#release-Date').getValue();

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

        var rFilter1 = Ext.create('Rally.data.wsapi.Filter', {
            property: 'c_ReleaseDate',
            operator: '>=',
            value: rDate
        });

        var d = Ext.Date.add(rDate, Ext.Date.DAY, +1);

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
            storyList = app._setFilter(item, storyList);
        });

        console.log('Stories matched', app.itemStore.getTotalCount());

        if(app.itemStore.getTotalCount() === 0) {
            console.log('No Entries');

            if(app.resultsGrid) {
                app.remove(app.resultsGrid);
                app.resultsGrid = null;
            }
            return;
        }

        app.reportStore = Ext.create('Rally.data.wsapi.Store', {
            model: app.reportType,
            autoLoad: true,
            filters: storyList,
            limit: Infinity, 
            listeners: {
                load: function(myStore, myData, success) {
                    if(!app.resultsGrid || app.resultsGrid === null) {
                        app._showGrid();
                    }
                },
                scope: app    
            },
            fetch: ['FormattedID','ObjectID', 'Name', 'Owner', 'Project']
        });

    },

    _setFilter: function(story, cFilter) {
        var app = this;

        var queryProp = '';

        if(app.reportType === 'Defect') {
            queryProp = 'Requirement.ObjectID';
        } else {
            queryProp = 'WorkProduct.ObjectID';
        }

        var dFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: queryProp,
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

        app.resultsGrid = Ext.create('Rally.ui.grid.Grid', {
            store: app.reportStore,
            columnCfgs: [         // Columns to display; must be the same names specified in the fetch: above in the wsapi data store
                'FormattedID', 'Name', 'Owner', 'Project'
            ]
        });

        app.add(app.resultsGrid);       // add the grid Component to the app-level Container (by doing this.add, it uses the app container)
    }
});