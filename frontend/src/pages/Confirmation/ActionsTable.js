import { TableContainer, Table, TableBody, TableCell, TableHead, TableRow } from "@material-ui/core";
import Card from "@material-ui/core/Card";
import LinearProgress from "@material-ui/core/LinearProgress";
import { withStyles } from "@material-ui/core/styles";
import ErrorIcon from "@material-ui/icons/Close";
import DoneIcon from "@material-ui/icons/Done";
import TBDIcon from "@material-ui/icons/Remove";
import WarningIcon from "@material-ui/icons/Warning";
import _isEmpty from "lodash/isEmpty";
import _isEqual from "lodash/isEqual";
import React from "react";
import strings from "../../localizeStrings";
import OverflowTooltip from "../Common/OverflowTooltip";

/**
 ** @actions Displayed by the table in following format
 **
 ** action: {
 **   displayName: string - Display Name of the project/subproject/workflowitem
 **   intent: string      - e.g. project.intent.listPermissions
 **
 ** }
 */

const styles = {
  card: {
    marginTop: "24px"
  },
  container: {
    minHeight: "56px",
    maxHeight: "180px"
  },
  tableBody: {
    display: "flex",
    flexDirection: "column"
  },
  textRow: {
    display: "flex",
    height: "40px"
  },
  headerRow: {
    display: "flex",
    height: "40px"
  },
  headerCell: {
    fontSize: "16px",
    textAlign: "left",
    flex: "1",
    borderBottom: "unset",
    padding: "0px"
  },
  columnHeaderCell: {
    fontWeight: "bold",
    backgroundColor: "transparent",

    fontSize: "14px",
    borderBottom: "unset",
    padding: "0px 8px 4px 8px",
    alignSelf: "center",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "140px"
  },
  tableRow: {
    display: "flex",
    minHeight: "30px",
    borderBottom: "unset"
  },
  tableCell: {
    fontSize: "14px",
    borderBottom: "unset",
    padding: "0px 8px 4px 8px",
    alignSelf: "center",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "140px"
  }
};

const generateHeader = (classes, status, actionTableColumns) => {
  return (
    <TableRow className={classes.headerRow} key={"header"}>
      <TableCell key={"header-type"} className={classes.columnHeaderCell} style={{ flex: 3 }}>
      <OverflowTooltip text={strings.common.type} />
      </TableCell>
      {actionTableColumns.nameColumn ? (
        <TableCell key={"header-displayName"} className={classes.columnHeaderCell} style={{ flex: 3 }}>
          <OverflowTooltip text={strings.common.name} />
        </TableCell>
      ) : null}
      {actionTableColumns.permissionColumn ? (
        <TableCell key={"header-permission"} className={classes.columnHeaderCell} style={{ flex: 3 }}>
          <OverflowTooltip text={strings.common.permission} />
        </TableCell>
      ) : null}
      {actionTableColumns.actionColumn ? (
        <TableCell key={"header-action"} className={classes.columnHeaderCell} style={{ flex: 3 }}>
          <OverflowTooltip text={strings.common.actions} />
        </TableCell>
      ) : null}
      {actionTableColumns.userOrGroupColumn ? (
        <TableCell key={"header-identity"} className={classes.columnHeaderCell} style={{ flex: 3 }}>
          <OverflowTooltip text={strings.confirmation.user_group} />
        </TableCell>
      ) : null}
      {status ? (
        <TableCell key={"header-status"} className={classes.columnHeaderCell} style={{ textAlign: "right", flex: 1 }}>
          <OverflowTooltip text={strings.common.status} />
        </TableCell>
      ) : null}
    </TableRow>
  );
};

const generateActions = (classes, actions, executedActions, failedAction, users, groups, status, actionTableColumns) => {
  const actionsTable = [];

  actions.forEach((action, index) => {

    const type = strings.common[action.intent.split(".")[0]];
    const userOrGroup = users.find(user => user.id === action.identity) || groups.find(group => group.groupId === action.identity);

    actionsTable.push(
      <TableRow className={classes.tableRow} key={index + "-" + action.displayName + "-" + action.permission}>
        <TableCell key={index + "-type"} className={classes.tableCell} style={{ flex: 3 }}>
          {type}
        </TableCell>
        {actionTableColumns.nameColumn ? (
          <TableCell key={index + "-displayName"} className={classes.tableCell} style={{ flex: 3 }}>
            <OverflowTooltip text={action.displayName} />
          </TableCell>
        ) : null}
        {actionTableColumns.permissionColumn ? (
          <TableCell key={index + "-permission"} className={classes.tableCell} style={{ flex: 3 }}>
            <OverflowTooltip text={makeReadable(action.permission)} />
          </TableCell>
        ) : null}
        {actionTableColumns.actionColumn ? (
          <TableCell key={index + "-action"} className={classes.tableCell} style={{ flex: 3 }}>
            <OverflowTooltip text={makeReadable(action.intent)} />
          </TableCell>
        ) : null}
        {actionTableColumns.userOrGroupColumn ? (
          <TableCell key={index + "-userName"} className={classes.tableCell} style={{ flex: 3 }}>
            <OverflowTooltip text={userOrGroup ? userOrGroup.displayName : ""} />
          </TableCell>
        ) : null}
        {status ? (
          <TableCell
            key={index + "-status"}
            className={classes.tableCell}
            style={{ textAlign: "right", position: "relative", flex: 1 }}
          >

            {getStatusIcon(executedActions, failedAction, action)}
          </TableCell>
        ) : null}
      </TableRow>
    );
  });
  return actionsTable;
};

const getStatusIcon = (executedActions, failedAction, action) => {
  if (executedActions === undefined || _isEqual(action, failedAction)) {
    return <ErrorIcon titleAccess={strings.status.error}/>;
  }

  if(action.isUserPermitted !== undefined && !action.isUserPermitted) {
    return <WarningIcon titleAccess={strings.status.warning}/>;
  }

  if (actionExecuted(executedActions, action)) {
    return <DoneIcon titleAccess={strings.status.done}/>;
  }

  return <TBDIcon titleAccess={strings.status.toBeDone}/>;
};


const actionExecuted = (executedActions, action) => {
  return executedActions.some(item => {
    return action.identity === item.identity && action.intent === item.intent && action.permission === item.permission;
  });
};

const makeReadable = (intent) => {
  const splittedString = intent ? intent.split(".") : "";
  return strings.intents[splittedString[splittedString.length - 1]] || splittedString[splittedString.length - 1];
};

const ActionsTable = props => {
  const {
    classes,
    actions,
    executedActions,
    executingActions,
    failedAction,
    users,
    status = true,
    groups,
    // eslint-disable-next-line no-useless-computed-key
    ["data-test"]: dataTest
  } = props;
  let actionTableColumns = {
    nameColumn: false,
    permissionColumn: false,
    actionColumn: false,
    userOrGroupColumn: false
  };

  actions.forEach(a => {
    _isEmpty(a.displayName) ? (actionTableColumns.nameColumn = false) : (actionTableColumns.nameColumn = true);
    _isEmpty(a.permission)
      ? (actionTableColumns.permissionColumn = false)
      : (actionTableColumns.permissionColumn = true);
    _isEmpty(a.intent) ? (actionTableColumns.actionColumn = false) : (actionTableColumns.actionColumn = true);
    _isEmpty(a.identity)
      ? (actionTableColumns.userOrGroupColumn = false)
      : (actionTableColumns.userOrGroupColumn = true);
  });

  return actions ? (
    <>
      <Card className={classes.card} data-test={dataTest}>
        <TableContainer className={classes.container}>
          <Table aria-label="sticky table" data-test="actions-table">
            <TableHead data-test="actions-table-head" key={"wrapper"}>
              {generateHeader(classes, status, actionTableColumns)}
            </TableHead>
            <TableBody data-test="actions-table-body" className={classes.tableBody}>
              {generateActions(classes, actions, executedActions, failedAction, users, groups, status, actionTableColumns)}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      {executingActions ? <LinearProgress color="primary" /> : null}
    </>
  ) : null;
};

export default withStyles(styles)(ActionsTable);
