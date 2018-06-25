import React from 'react';
import PropTypes from 'prop-types';
import { Button, Popover, Checkbox, FormGroup, OverlayTrigger } from 'react-bootstrap';
import Format from './Format';


export default class Filetype extends React.Component {

    constructor(props) {
        super(props);

        if (props.formats) {
            // si tous les enfants on met à vrai sinon à false
            if (props.checkedFormats) {
                const allChecked = props.checkedFormats.split(',').length === props.formats.split(',').length;
                this.state = {
                    [props.filetype]: allChecked,
                    indeterminate: !allChecked,
                };
            } else {
                this.state = {
                    [props.filetype]: false,
                    indeterminate: false,
                };
            }
        } else {
            this.state = {
                [props.filetype]: props.value,
                indeterminate: false,
            };
        }

        this.handleInputChange = this.handleInputChange.bind(this);
        this.updateCurrent = this.updateCurrent.bind(this);
        this.verifyChildren = this.verifyChildren.bind(this);
        this.child = [];
        if (this.props.formats) {
            this.formats = props.formats.split(',')
            .map((format, n) =>
                <Format
                    ref={(instance) => { this.child[n] = instance; }}
                    key={`format${format}`}
                    label={props.labels.split('|')[n]}
                    format={format}
                    filetype={props.filetype}
                    value={props.checkedFormats
                            ? props.checkedFormats.split(',').includes(props.formats.split(',')[n])
                            : false}
                    onChange={props.onFormatChange}
                    disabled={props.disabled}
                    updateParent={this.updateCurrent}
                    verifyOtherFormats={this.verifyChildren}
                    withPopover={this.props.withPopover}
                />);
        }

        this.overlayedLabel = (
            <span>{props.label}</span>
        );

        this.popoverText = '';
        switch (this.props.filetype) {
        case 'metadata': this.popoverText = 'Le format JSON est téléchargé par défaut';
            break;
        case 'fulltext': this.popoverText = 'Le choix du format de texte intégral est à faire en fonction ' +
                                            'de l\'utilisation souhaitée du corpus';
            break;
        case 'annexes': this.popoverText = 'Documents textuels, images, vidéos, etc.';
            break;
        case 'covers': this.popoverText = 'Documents textuels, images, etc.';
            break;
        case 'enrichments': this.popoverText =
         'Les différents enrichissements proposés dans ISTEX seront prochainement téléchargeables';
            break;
        default: this.popoverText = 'Type de Fichier Non reconnu';
        }
    }

    checkChildren() {
        this.child.forEach((c) => {
            c.check(this);
        });
    }

    uncheckChildren() {
        this.child.forEach((c) => {
            c.uncheck();
        });
    }

    updateCurrent(type) {
        this.setState({
            indeterminate: true,
        });
        /* if (window.localStorage && JSON.parse(window.localStorage.getItem('dlISTEXstateForm'))) {
            this.setState({
                [type]: JSON.parse(window.localStorage.getItem('dlISTEXstateForm'))[type],
            });
        } else { */
        this.setState({
            [type]: false,
        });
        // }
    }

    checkCurrent(type) {
        this.setState({
            indeterminate: false,
            [type]: true,
        });

        this.props.onChange({
            filetype: this.props.filetype,
            value: true,
            format: this.state,
        });
    }

    uncheckCurrent(type) {
        this.setState({
            [type]: false,
            [this.props.filetype]: false,
            indeterminate: false,
        });

        this.props.onChange({
            filetype: this.props.filetype,
            value: false,
            format: this.state,
        });

        this.uncheckChildren();
    }

    verifyChildren(type) {
        if (this.child.length !== 0) {
            let noChildChecked = true;
            let i = 0;
            while (i < this.child.length && noChildChecked) {
                if (this.child[i].state[this.child[i].props.format]) {
                    noChildChecked = false;
                }
                i += 1;
            }
            if (noChildChecked) {
                this.uncheckCurrent(type);
            } else {
                i = 0;
                let allChildChecked = true;
                while (i < this.child.length && allChildChecked) {
                    if (!this.child[i].state[this.child[i].props.format]) {
                        allChildChecked = false;
                    }
                    i += 1;
                }
                if (allChildChecked) {
                    this.checkCurrent(type);
                } else {
                    this.updateCurrent(type);
                }
            }
        }
    }

    handleInputChange(event) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (this.state.indeterminate) {
            this.setState({
                [name]: true,
                indeterminate: false,
            });
        } else if (this.state[name]) {
            this.setState({
                [name]: false,
                indeterminate: false,
            });
        } else {
            this.setState({
                [name]: true,
                indeterminate: false,
            });
        }
        this.props.onChange({
            filetype: this.props.filetype,
            value,
            format: this.state,
        });
        if (value) {
            this.checkChildren();
        } else {
            this.uncheckChildren();
        }
    }

    render() {
        let CssClass = null;
        if (this.state.indeterminate) {
            CssClass = 'indeterminate';
        } else {
            CssClass = 'determinate';
        }
        const closingButton = (
            <Button
                bsClass="buttonClose"
                onClick={() => { document.body.click(); }}
            >
                &#x2716;
            </Button>);
        return (
            <FormGroup bsClass="istex-form-group">
                <Checkbox
                    className={CssClass}
                    bsClass="checkboxperso"
                    name={this.props.filetype}
                    checked={this.state[this.props.filetype]}
                    onChange={this.handleInputChange}
                    disabled={this.props.disabled}
                >
                    <span />
                    {this.overlayedLabel}
                    <OverlayTrigger
                        rootClose
                        trigger="click"
                        placement="right"
                        overlay={
                            <Popover
                                id={`popover-${this.props.filetype}`}
                                title={<span>Description {this.props.label}{closingButton}</span>}
                            >
                                {this.popoverText}
                            </Popover>}
                        onClick={(e) => { e.preventDefault(); }}
                    >
                        <i id="glyphiconFiletype" role="button" className="fa fa-info-circle" aria-hidden="true" />
                    </OverlayTrigger>
                </Checkbox>
                <FormGroup bsClass="indent">
                    {this.formats}
                </FormGroup>
            </FormGroup>
        );
    }
    }

Filetype.propTypes = {
    label: PropTypes.string.isRequired,
    filetype: PropTypes.string.isRequired,
    formats: PropTypes.string,
    labels: PropTypes.string,
    value: PropTypes.bool.isRequired,
    checkedFormats: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onFormatChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    withPopover: PropTypes.bool,
};

Filetype.defaultProps = {
    value: false,
    disabled: false,
    formats: '',
    labels: '',
    checkedFormats: '',
    withPopover: false,
};
