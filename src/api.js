import axios from 'axios';

export const fetchPeers = () => axios.get('/peerInfo');
export const fetchStreams = () => axios.get('/projects');
export const postStream = (flowName) => axios.get('/streams/' + flowName);
export const fetchStreamItems = (flowName) => axios.get('/streams/' + flowName);
export const postSubProject = (parentProject, subProjectName, subProjectAmount, subProjectPurpose, subProjectCurrency) => axios.post('/projects/subprojects', { parentStream: parentProject, newStream: subProjectName, amount:subProjectAmount, purpose:subProjectPurpose, currency: subProjectCurrency, status:'Open' })
export const postProject = (name, parent, amount, purpose, currency) => axios.post('/projects', { newStream: name, parent: parent, amount: amount, purpose:purpose, currency: currency})
export const fetchNodeInformation = () => axios.get('/nodes');
export const fetchNotifications = (user) => axios.get('/notifications/' + user);
export const fetchWorkflowItems = (subProjectName) => axios.get('/projects/'+subProjectName+'/workflows');
export const login = (username, password) => axios.post('/login', {username, password});
export const fetchUsers = () => axios.get('/users');
export const postWorkflowItem = (stream, workflowItemName, amount, currency, purpose, addData, status, assignee) => axios.post('/projects/subprojects/workflow', { streamName: stream, workflowName: workflowItemName, amount: amount, currency: currency, purpose:purpose, addData:addData, status:status, assignee:assignee})
