# Link Analysis App For Splunk #
This app provides a seperate visualisation framework for doing force directed visualisation with additional functionality.

For more about the visualisation framework visit here.
https://github.com/cytoscape/cytoscape.js

### Installation Instructions

1. Download the app and unzip to $SPLUNK_HOME/etc/apps on your Search Head
2. Restart Splunk
3. Generate a search that has a 'source', 'target' and optionally a count. 

### Search Examples

- index=firewall action=allowed | stats count by src_ip, dest_ip | table src_ip, dest_ip, count
- sourcetype=access_combined | stats count by src_ip,uri_path

### Configuration Options

#### Format
1. Theme Color - Changes background image color - Disabled for now
2. Force Layout - Allows you to change the layout style 

### Bugs
Please report any bugs to this page.  I accept pull requests.

### Feature Requests
Post any feature requests as issues and I will look around to them.  My only feedback prior to making feature requests is ensuring that the feature does not reduce the flexibility of the app :).

### Tested on
**Mac**
- Safari Version 11.0 
- Chrome Version 61.0.X (Official Build) (64-bit)
- Firefox 64.0
