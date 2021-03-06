import { $, browser, by, element, ElementFinder, promise, protractor } from 'protractor';
import { Helper } from '../helper.po';
import { PageHelper } from '../page-helper.po';

const EC = protractor.ExpectedConditions;
const pages = {
  index: '/#/pool',
  create: '/#/pool/create'
};

export class PoolPageHelper extends PageHelper {
  pages = pages;

  private isPowerOf2(n: number): boolean {
    // tslint:disable-next-line: no-bitwise
    return (n & (n - 1)) === 0;
  }

  @PageHelper.restrictTo(pages.index)
  exist(name: string, oughtToBePresent = true): promise.Promise<any> {
    return this.getTableCellByContent(name).then((elem) => {
      const waitFn = oughtToBePresent ? EC.visibilityOf(elem) : EC.invisibilityOf(elem);
      return browser.wait(waitFn, Helper.TIMEOUT).catch(() => {
        const visibility = oughtToBePresent ? 'invisible' : 'visible';
        const msg = `Pool "${name}" is ${visibility}, but should not be. Waiting for a change timed out`;
        return promise.Promise.reject(msg);
      });
    });
  }

  @PageHelper.restrictTo(pages.create)
  create(name: string, placement_groups: number, ...apps: string[]): promise.Promise<any> {
    const nameInput = $('input[name=name]');
    nameInput.clear();
    if (!this.isPowerOf2(placement_groups)) {
      return Promise.reject(`Placement groups ${placement_groups} are not a power of 2`);
    }
    return nameInput.sendKeys(name).then(() => {
      element(by.cssContainingText('select[name=poolType] option', 'replicated'))
        .click()
        .then(() => {
          expect(element(by.css('select[name=poolType] option:checked')).getText()).toBe(
            ' replicated '
          );
          $('input[name=pgNum]')
            .sendKeys(protractor.Key.CONTROL, 'a', protractor.Key.NULL, placement_groups)
            .then(() => {
              this.setApplications(apps);
              return element(by.css('cd-submit-button')).click();
            });
        });
    });
  }

  edit_pool_pg(name: string, new_pg: number): promise.Promise<any> {
    if (!this.isPowerOf2(new_pg)) {
      return Promise.reject(`Placement groups ${new_pg} are not a power of 2`);
    }
    return this.getTableCellByContent(name).then((elem) => {
      elem.click(); // select pool from the table
      element(by.cssContainingText('button', 'Edit')).click(); // click edit button
      expect(this.getBreadcrumbText()).toEqual('Edit'); // verify we are now on edit page
      $('input[name=pgNum]')
        .sendKeys(protractor.Key.CONTROL, 'a', protractor.Key.NULL, new_pg)
        .then(() => {
          element(by.css('cd-submit-button')).click();
          const str = `${new_pg} active+clean`;
          browser
            .wait(
              EC.visibilityOf(this.getTableRow(name)),
              Helper.TIMEOUT,
              'Timed out waiting for table row to load'
            )
            .then(() => {
              return browser.wait(
                EC.textToBePresentInElement(this.getTableRow(name), str),
                Helper.TIMEOUT,
                'Timed out waiting for placement group to be updated'
              );
            });
        });
    });
  }

  private setApplications(apps: string[]) {
    if (!apps || apps.length === 0) {
      return;
    }
    element(by.css('.float-left.mr-2.select-menu-edit'))
      .click()
      .then(() => {
        browser
          .wait(
            Helper.EC.visibilityOf(element(by.css('.popover-content.popover-body'))),
            Helper.TIMEOUT
          )
          .then(() =>
            apps.forEach((app) =>
              element(by.cssContainingText('.select-menu-item-content', app)).click()
            )
          );
      });
  }

  @PageHelper.restrictTo(pages.index)
  delete(name: string): promise.Promise<any> {
    return this.getTableCellByContent(name).then((tableCell: ElementFinder) => {
      return tableCell.click().then(() => {
        return $('.table-actions button.dropdown-toggle') // open submenu
          .click()
          .then(() => {
            return $('li.delete a') // click on "delete" menu item
              .click()
              .then(() => {
                browser
                  .wait(Helper.EC.visibilityOf($('.custom-control-label')), Helper.TIMEOUT)
                  .then(() => {
                    const getConfirmationCheckbox = () => $('.custom-control-label');
                    browser
                      .wait(Helper.EC.visibilityOf(getConfirmationCheckbox()), Helper.TIMEOUT)
                      .then(() => {
                        this.moveClick(getConfirmationCheckbox()).then(() => {
                          return element(by.cssContainingText('button', 'Delete Pool')).click(); // Click Delete item
                        });
                      });
                  });
              });
          });
      });
    });
  }
}
