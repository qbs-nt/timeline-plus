import React from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Hidden from '@material-ui/core/Hidden';
// import Divider from '@material-ui/core/Divider';
import MenuIcon from '@material-ui/icons/Menu';

import NavMenu from './NavMenu'
import HomePage from './HomePage'
import UsagePage from './UsagePage'
import InstallationPage from './InstallationPage'
import ItemsPage from './ItemsPage'
import GroupsPage from './GroupsPage'
import OptionsPage from './OptionsPage'
import MethodsPage from './MethodsPage'
import EventsPage from './EventsPage'
import TemplatesPage from './TemplatesPage'
import LocalizationPage from './LocalizationPage'
import ExamplesPage from './ExamplesPage'
import StylesPage from './StylesPage'

const drawerWidth = 240;

const styles = theme => ({
  root: {
    flexGrow: 1,
    height: '100%',
    zIndex: 1,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    width: '100%',
  },
  appBar: {
    position: 'absolute',
    marginLeft: drawerWidth,
    [theme.breakpoints.up('md')]: {
      width: `calc(100% - ${drawerWidth}px)`,
    },
  },
  navIconHide: {
    [theme.breakpoints.up('md')]: {
      display: 'none',
    },
  },
  toolbar: { 
    ...theme.mixins.toolbar,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLink: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoImg: {
    position: 'relative',
    right: '8px',
    bottom: '3px',
    width: '30px',
  },
  logoTitle: {
    display: 'inline-block',
    position: 'relative',
    bottom: '6px',
  },
  drawerPaper: {
    width: drawerWidth,
    [theme.breakpoints.up('md')]: {
      position: 'relative',
    },
  },
  content: {
    position: 'relative',
    flexGrow: 1,
    padding: theme.spacing.unit * 3,
    backgroundColor: theme.palette.background.default,
    overflowY: 'scroll',
    display: 'flex',
    flexDirection: 'column',
  },
});

class App extends React.Component {
  state = {
    mobileOpen: false,
  };

  handleDrawerToggle = () => {
    this.setState(state => ({ mobileOpen: !state.mobileOpen }));
  };

  render() {
    const { classes, theme } = this.props;

    const drawer = (
      <div>
        <div className={classes.toolbar}>
          <Link to='/'>
            <div className={classes.logoLink}>
              <img src={process.env.PUBLIC_URL + '/logo2.png'} alt='logo' className={classes.logoImg}/>
              <Typography variant="title" color="inherit" noWrap className={classes.logoTitle}>
                Timeline-plus
              </Typography>
            </div>
          </Link>
        </div>
        <NavMenu />
      </div>
    );

    return (
      <Router>
        <div className={classes.root}>
          <AppBar className={classes.appBar}>
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="Open drawer"
                onClick={this.handleDrawerToggle}
                className={classes.navIconHide}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="title" color="inherit" noWrap>
                Documentation
              </Typography>
            </Toolbar>
          </AppBar>
          <Hidden mdUp>
            <Drawer
              variant="temporary"
              anchor={theme.direction === 'rtl' ? 'right' : 'left'}
              open={this.state.mobileOpen}
              onClose={this.handleDrawerToggle}
              classes={{
                paper: classes.drawerPaper,
              }}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile.
              }}
            >
              {drawer}
            </Drawer>
          </Hidden>
          <Hidden smDown implementation="css">
            <Drawer
              variant="permanent"
              open
              classes={{
                paper: classes.drawerPaper,
              }}
            >
              {drawer}
            </Drawer>
          </Hidden>
          <main className={classes.content}>
            <div className={classes.toolbar} />

            <Route exact path="/timeline-plus/" component={HomePage} />
            <Route exact path="/timeline-plus/getting-started/installation" component={InstallationPage} />
            <Route exact path="/timeline-plus/getting-started/usage" component={UsagePage} />
            <Route exact path="/timeline-plus/items" component={ItemsPage} />
            <Route exact path="/timeline-plus/groups" component={GroupsPage} />
            <Route exact path="/timeline-plus/options" component={OptionsPage} />
            <Route exact path="/timeline-plus/methods" component={MethodsPage} />
            <Route exact path="/timeline-plus/events" component={EventsPage} />
            <Route exact path="/timeline-plus/templates" component={TemplatesPage} />
            <Route exact path="/timeline-plus/localization" component={LocalizationPage} />
            <Route exact path="/timeline-plus/examples" component={ExamplesPage} />
            <Route exact path="/timeline-plus/styles" component={StylesPage} />

          </main>
        </div>
      </Router>
    );
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};

export default withStyles(styles, { withTheme: true })(App);