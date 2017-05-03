import React from 'react';
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/Table';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import SubProjectCreationStepper from './SubProjectCreationStepper';
import { toAmountString, statusMapping } from '../../../helper';

const getTableEntries = (subProjects, location, history) => {
  return subProjects.map((subProject, index) => {
    var amount = toAmountString(subProject.details.amount, subProject.details.currency)
    return (
      <TableRow key={index} selectable={false}>
        <TableRowColumn>{subProject.details.projectName}</TableRowColumn>
        <TableRowColumn>{amount}</TableRowColumn>
        <TableRowColumn>{statusMapping[subProject.details.status]}</TableRowColumn>
        <TableRowColumn>
          <FlatButton label="Select" onTouchTap={() => history.push('/projects/' + location.pathname.split('/')[2] + '/' + subProject.name)} secondary={true} />
        </TableRowColumn>
      </TableRow>
    );
  });
}

const SubProjectsTable = ({ subProjects, hideWorkflowDialog, workflowDialogVisible, history, location, createSubProjectItem, subProjectName, storeSubProjectName, subProjectAmount, storeSubProjectAmount, subProjectPurpose, storeSubProjectPurpose, subProjectCurrency, storeSubProjectCurrency, showSnackBar, storeSnackBarMessage }) => {
  const tableEntries = getTableEntries(subProjects, location, history);

  return (
    <Table>
      <TableHeader displaySelectAll={false}
        adjustForCheckbox={false}>
        <Dialog
          title="New Sub-project"
          modal={false}
          open={workflowDialogVisible}
        >
          <SubProjectCreationStepper hideWorkflowDialog={hideWorkflowDialog} location={location} createSubProjectItem={createSubProjectItem} subProjectName={subProjectName} storeSubProjectName={storeSubProjectName}
            subProjectAmount={subProjectAmount}
            storeSubProjectAmount={storeSubProjectAmount}
            subProjectPurpose={subProjectPurpose}
            storeSubProjectPurpose={storeSubProjectPurpose}
            subProjectCurrency={subProjectCurrency}
            storeSubProjectCurrency={storeSubProjectCurrency}
            showSnackBar={showSnackBar}
            storeSnackBarMessage={storeSnackBarMessage} />
        </Dialog>

        <TableRow>
          <TableHeaderColumn>Sub-project</TableHeaderColumn>
          <TableHeaderColumn>Budget</TableHeaderColumn>
          <TableHeaderColumn>Status</TableHeaderColumn>
          <TableHeaderColumn> </TableHeaderColumn>
        </TableRow>
      </TableHeader>
      <TableBody displayRowCheckbox={false}
        adjustForCheckbox={false}>
        {tableEntries}
      </TableBody>
    </Table>
  )
}

export default SubProjectsTable;
