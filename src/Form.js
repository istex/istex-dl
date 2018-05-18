import React from 'react';
import $ from 'jquery';
import PropTypes from 'prop-types';
import InputRange from 'react-input-range';
import NumericInput from 'react-numeric-input';
import Textarea from 'react-textarea-autosize';
import { Modal, Button, OverlayTrigger, Popover, Tooltip, Radio } from 'react-bootstrap';
import decamelize from 'decamelize';
import qs from 'qs';
import commaNumber from 'comma-number';
import 'react-input-range/lib/css/index.css';
import Filetype from './Filetype';
import Labelize from './i18n/fr';

export default class Form extends React.Component {

    constructor(props) {
        super(props);
        const url = document.location.href;
        const parsedUrl = qs.parse(url.slice(url.indexOf('?') + 1));
        this.defaultState = {
            q: parsedUrl.q || '',
            size: parsedUrl.size || 5000,
            limitNbDoc: 10000,
            extractMetadata: false,
            extractFulltext: true,
            extractEnrichments: false,
            extractCovers: false,
            extractAnnexes: false,
            downloading: parsedUrl.download || false,
            URL2Download: '',
            errorRequestSyntax: '',
            errorDuringDownload: '',
            rankBy: parsedUrl.rankBy || 'relevance',
        };

        this.state = this.defaultState;
        if (parsedUrl.size > 0) {
            if (parsedUrl.download) {
                this.handleSubmit(new Event('submit'));
            }
            if (parsedUrl.q) {
                const eventQuery = new Event('Query');
                eventQuery.query = parsedUrl.q;
                this.handleQueryChange(eventQuery);
                if (window.localStorage) {
                    window.localStorage.setItem('dlISTEXstateForm', JSON.stringify(this.state));
                }
            }
        }
        /* else if (window.localStorage && JSON.parse(window.localStorage.getItem('dlISTEXstateForm'))
        && !JSON.parse(window.localStorage.getItem('dlISTEXstateForm')).downloading) {
            this.state = JSON.parse(window.localStorage.getItem('dlISTEXstateForm'));
        } */

        this.child = [];
        this.handleQueryChange = this.handleQueryChange.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleFiletypeChange = this.handleFiletypeChange.bind(this);
        this.handleFormatChange = this.handleFormatChange.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handlerankByChange = this.handlerankByChange.bind(this);
        this.isDownloadDisabled = this.isDownloadDisabled.bind(this);
    }

    componentDidMount() {
        this.recupererEtatDesEnfants();
    }

    recupererEtatDesEnfants() {
        const self = this;
        this.child.forEach((type) => {
            type.child.forEach((format) => {
                if (format.state[format.props.format]) {
                    self.setState({
                        [format.state.name]: true,
                    });
                }
            });
        });
    }

    handleQueryChange(event, query = null) {
        const self = this;
        let queryNotNull = query;
        if (event) {
            this.setState({
                errorRequestSyntax: '',
                q: event.query || event.target.value,
            });
            queryNotNull = event.query || event.target.value;
        } else {
            this.setState({
                errorRequestSyntax: '',
            });
        }
        const ISTEX = this.buildURLFromState(queryNotNull, false);
        ISTEX.searchParams.delete('extract');
        if (this.istexDlXhr) {
            this.istexDlXhr.abort();
        }
        this.istexDlXhr = $.get(ISTEX.href)
        .done((json) => {
            const { total } = json;
            return self.setState({
                size: (total <= self.state.limitNbDoc ? total : self.state.limitNbDoc),
                total,
            });
        })
        .fail((err) => {
            if (err.status >= 500) {
                return self.setState({ errorServer: 'Error server TODO ...' });
            }
            if (err.status >= 400 && err.status < 500) {
                return self.setState({ errorRequestSyntax: err.responseJSON._error });
            }
            return null;
        },
        )
        .always(() => {
            self.istexDlXhr = null;
        });
    }

    handleInputChange(event) {
        const target = event.target;
        const name = target.name;
        const value = target.type && target.type === 'checkbox' ? target.checked : target.value;
        this.setState({
            [name]: value,
        });
    }

    handleFiletypeChange(filetypeEvent) {
        const { filetype, value } = filetypeEvent;
        const name = 'extract'.concat(filetype.charAt(0).toUpperCase()).concat(filetype.slice(1));
        this.setState({
            [name]: value,
        });
    }

    handlerankByChange(rankByEvent) {
        const target = rankByEvent.target;
        const name = target.name;
        this.setState({
            rankBy: name,
        });
    }

    handleFormatChange(formatEvent) {
        const filetype = formatEvent.filetype;
        const format = formatEvent.format;
        const name = 'extract'
        .concat(filetype.charAt(0).toUpperCase()).concat(filetype.slice(1))
        .concat(format.charAt(0).toUpperCase()).concat(format.slice(1));
        this.setState({
            [name]: formatEvent.value,
        });
    }

    handleSubmit(event) {
        const { href } = this.buildURLFromState();
        this.setState({
            downloading: true,
            URL2Download: href,
        });
        window.setTimeout(() => {
            window.location = href;
        }, 1000);
        event.preventDefault();
    }

    handleCancel(event) {
        this.setState({
            downloading: false,
            q: '',
            URL2Download: '',
        });
        event.preventDefault();
    }

    updateUrl() {
        const newUrl = this.buildURLFromState().href.slice(this.buildURLFromState().href.indexOf('?'));
        window.history.pushState('', '', newUrl);
    }


    buildURLFromState(query = null, withHits = true) {
        const ISTEX = new URL('https://api.istex.fr/document/');
        const filetypeFormats = Object.keys(this.state)
        .filter(key => key.startsWith('extract'))
        .filter(key => this.state[key])
        .map(key => decamelize(key, '-'))
        .map(key => key.split('-').slice(1))
        .map(([filetype, format]) => ({ filetype, format }))
        .reduce((prev, { filetype, format }) => {
            if (!prev[filetype]) {
                prev[filetype] = [format];
            } else {
                prev[filetype].push(format);
            }
            return prev;
        }, {});
        const extract = Object.keys(filetypeFormats)
        .reduce((prev, filetype) => {
            const formats = filetypeFormats[filetype];
            return prev
            .concat(filetype)
            .concat(formats[0] || formats.length > 1 ? '[' : '')
            .concat(!formats[0] ? formats.slice(1) : formats)
            .concat(formats[0] || formats.length > 1 ? '];' : ';');
        }
        , '')
        .slice(0, -1);
        ISTEX.searchParams.set('q', query || this.state.q);
        ISTEX.searchParams.set('extract', extract);
        if (withHits) {
            ISTEX.searchParams.set('size', this.state.size);
        }
        ISTEX.searchParams.set('sid', 'istex-dl');
        if (this.state.rankBy === 'random') {
            ISTEX.searchParams.set('rankBy', this.state.rankBy);
        }
        return ISTEX;
    }

    erase() {
        this.child.forEach((c) => {
            if (!c.props.disabled) {
                const name = 'extract'
                .concat(c.props.filetype.charAt(0).toUpperCase())
                .concat(c.props.filetype.slice(1));
                c.uncheckCurrent(name);
            }
        });

        const blankState = this.defaultState;
        blankState.q = '';
        blankState.extractFulltext = false;
        this.setState(blankState, () => { window.localStorage.clear(); });
    }

    tryExempleRequest(queryExample) {
        this.setState({
            q: queryExample,
        });
        this.handleQueryChange(null, queryExample);
        document.body.click();
    }

    updateUrlAndLocalStorage() {
        /*
        if (window.localStorage) {
            window.localStorage.setItem('dlISTEXstateForm', JSON.stringify(this.state));
        } */
        this.updateUrl();
    }

    isDownloadDisabled() {
        const filetypeFormats = Object.keys(this.state)
        .filter(key => key.startsWith('extract'))
        .filter(key => this.state[key]);
        return (this.state.q.length <= 0 || this.state.total <= 0 || filetypeFormats.length <= 0);
    }
    render() {
        const closingButton = (
            <Button
                bsClass="buttonClose"
                onClick={() => { document.body.click(); }}
            >
                &#x2716;
            </Button>);

        const popoverRequestHelp = (
            <Popover
                id="popover-request-help"
                title={<span> Aide à la construction de requêtes {closingButton}</span>}

            >
                Aidez-vous du <a href="http://demo.istex.fr/" rel="noopener noreferrer" target="_blank">démonstrateur ISTEX</a> ou
                de la <a href="https://api.istex.fr/documentation/search/" rel="noopener noreferrer" target="_blank">documentation ISTEX</a> pour construire votre requête.<br />
                Des exemples vous sont également proposés sur la droite.<br />
                Si vous avez besoin de conseils, <a href="mailto:contact@listes.istex.fr">contactez l’équipe ISTEX</a>.
            </Popover>
        );

        const popoverRequestExamples = (
            <Popover
                id="popover-request-examples"
                title={<span> Exemples de requêtes {closingButton}</span>}
            >
                Voici quelques exemples de requêtes dont vous pouvez vous inspirer.
                Cliquez sur celle de votre choix et la zone de requête sera remplie par le contenu de l’exemple.
            </Popover>
        );
        const queryExample1 = Labelize.vieillissement;
        const popoverRequestExample1 = (
            <Popover
                id="popover-request-example1"
                title={<span> Extrait corpus “Vieillissement” {closingButton}</span>}
            >
                Équation utilisant des identifiants ISTEX<br />
                <button
                    type="button" className="btn-sm"
                    onClick={() => this.tryExempleRequest(queryExample1)}
                >
                    Essayer cette requête
                </button>
            </Popover>
        );
        const queryExample2 = Labelize.astrophysique;
        const popoverRequestExample2 = (
            <Popover
                id="popover-request-example2"
                title={<span> Extrait corpus “Astrophysique” {closingButton}</span>}
            >
                Équation utilisant des données bibliographiques<br />
                <button
                    type="button" className="btn-sm"
                    onClick={() => this.tryExempleRequest(queryExample2)}
                >
                    Essayer cette requête
                </button>
            </Popover>
        );
        const queryExample3 = Labelize.poissons;
        const popoverRequestExample3 = (
            <Popover
                id="popover-request-example3"
                title={<span> Extrait corpus “Poissons” {closingButton}</span>}
            >
                Équation utilisant des mots-clés, des données bibliographiques et des indicateurs de qualité<br />
                <button
                    type="button" className="btn-sm"
                    onClick={() => this.tryExempleRequest(queryExample3)}
                >
                    Essayer cette requête
                </button>
            </Popover>
        );
        const queryExample4 = Labelize.polaris;
        const popoverRequestExample4 = (
            <Popover
                id="popover-request-example4"
                title={<span> Extrait corpus “Polaris” {closingButton}</span>}
            >
                Équation utilisant des mots-clés, ainsi que tous les types d’opérateurs
                et de modes de recherches proposés dans ISTEX<br />
                <button
                    type="button" className="btn-sm"
                    onClick={() => this.tryExempleRequest(queryExample4)}
                >
                Essayer cette requête
                </button>
            </Popover>
        );
        const resetTooltip = (
            <Tooltip data-html="true" id="resetTooltip">
                Réinitialisez votre requête (les formulaires de cette page seront vidés)
            </Tooltip>
        );
        const previewTooltip = (
            <Tooltip data-html="true" id="previewTooltip">
                Cliquez pour pré-visualiser les documents correspondant à votre requête
            </Tooltip>
        );

        const disabledDownloadTooltip = (
            <Tooltip data-html="true" id="disabledDownloadTooltip">
                Pour télécharger indiquez une requête qui renvoie
                au moins un document et cochez au moins un format de fichier
            </Tooltip>
        );
        const popoverRequestLimitWarning = (
            <Popover
                id="popover-request-limit-warning"
                html="true"
                title={<span>Attention{closingButton}</span>}
                trigger="click"
            >
                Reformulez votre requête ou vous ne pourrez télécharger que les&nbsp;
                {commaNumber.bindWith('\xa0', '')(this.state.size)} premiers
                documents,classés par ordre de pertinence, (sur les&nbsp;
                {commaNumber.bindWith('\xa0', '')(this.state.total)} résultats potentiels)
            </Popover>
        );

        const popoverRequestLimitHelp = (
            <Popover
                id="popover-request-limit-help"
                title={<span> Limite temporaire {closingButton}</span>}
            >
                Aujourd’hui, il n’est pas possible de télécharger plus de&nbsp;
                {commaNumber.bindWith('\xa0', '')(this.state.limitNbDoc)} documents.
                L’<a href="mailto:contact@listes.istex.fr">équipe ISTEX</a> travaille à augmenter cette limite.
            </Popover>
        );
        const enrichmentsDisabledTooltip = (
            <Tooltip data-html="true" id="enrichmentsDisabledTooltip">
                Les différents enrichissements proposés dans ISTEX seront prochainement téléchargeables
            </Tooltip>
        );

        const coversTooltip = (
            <Tooltip data-html="true" id="coversTooltip">
                Documents textuels, images, etc.
            </Tooltip>
        );

        const emptyTooltip = (
            <Tooltip id="empty-tooltip" style={{ display: 'none' }} />
        );

        const appendicesTooltip = (
            <Tooltip data-html="true" id="appendicesTooltip">
                Documents textuels, images, vidéos, etc.
            </Tooltip>
        );
        this.updateUrlAndLocalStorage();
        const downloadDisabled = this.isDownloadDisabled();
        return (
            <div className={`container-fluid ${this.props.className}`}>
                <form onSubmit={this.handleSubmit}>

                    <div className="istex-dl-request row">

                        <div className="col-lg-1" />
                        <div className="col-lg-7">
                            <h2>
                                Requête
                                &nbsp;
                                <OverlayTrigger
                                    trigger="click"
                                    rootClose
                                    placement="top"
                                    overlay={popoverRequestHelp}
                                >
                                    <span role="button" className="glyphicon glyphicon-question-sign" />
                                </OverlayTrigger>
                                    &nbsp;
                                <OverlayTrigger
                                    placement="right"
                                    overlay={resetTooltip}
                                    onClick={() => this.erase()}
                                >
                                    <span
                                        role="button" className="glyphicon glyphicon-erase"
                                    />
                                </OverlayTrigger>

                            </h2>
                            <p>Formulez ci-dessous l’équation qui décrit le corpus souhaité :</p>
                            <div className="form-group">
                                <Textarea
                                    className="form-control"
                                    placeholder="brain AND language:fre"
                                    name="q"
                                    id="q"
                                    rows="3"
                                    autoFocus="true"
                                    value={this.state.q}
                                    onChange={this.handleQueryChange}
                                />
                            </div>

                            {this.state.total > 0 && this.state.q !== '' &&
                                <p>
                                    L’équation saisie correspond à
                                    &nbsp;
                                    <OverlayTrigger placement="bottom" overlay={previewTooltip}>
                                        <a>
                                            {this.state.total ?
                                             commaNumber.bindWith('\xa0', '')(this.state.total)
                                            .concat(' documents')
                                            : ''}
                                        </a>
                                    </OverlayTrigger>
                                    &nbsp;
                                    {this.state.total > this.state.limitNbDoc &&
                                    <OverlayTrigger
                                        trigger="click"
                                        rootClose
                                        placement="right"
                                        overlay={popoverRequestLimitWarning}

                                    >
                                        <span
                                            role="button"
                                            className="glyphicon glyphicon-warning-sign"
                                            style={{ color: 'red' }}
                                        />
                                    </OverlayTrigger>
                                    }
                                </p>
                            }

                            <div className="form-group">
                                Limite du nombre de documents souhaités
                                &nbsp;
                                <OverlayTrigger
                                    trigger="click"
                                    rootClose
                                    placement="right"
                                    overlay={popoverRequestLimitHelp}
                                >
                                    <span role="button" className="glyphicon glyphicon-question-sign" />
                                </OverlayTrigger>
                                &nbsp;
                                :
                                &nbsp;&nbsp;
                                <div style={{ width: '100px', display: 'inline-block' }}>
                                    <NumericInput
                                        className="form-control"
                                        min={0} max={this.state.limitNbDoc} value={this.state.size}
                                        onKeyPress={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                        onChange={size => this.setState({ size })}
                                    />
                                </div>
                                &nbsp;&nbsp;&nbsp;
                                <div style={{ width: '200px', display: 'inline-block' }}>
                                    <InputRange
                                        id="nb-doc-to-download"
                                        maxValue={this.state.limitNbDoc}
                                        minValue={0}
                                        value={Number(this.state.size)}
                                        onChange={size => this.setState({ size })}
                                    />
                                </div>
                            </div>
                            <div className="rankBy">
                                Choisir les documents :
                            </div>
                            <span className="radioGroupRankBy">
                                <Radio
                                    id="radioRelevance"
                                    inline
                                    name="relevance"
                                    checked={this.state.rankBy === 'relevance'}
                                    onChange={this.handlerankByChange}
                                >
                                    Par perticence
                                </Radio>
                                <Radio
                                    id="radioRandom"
                                    inline
                                    name="random"
                                    checked={this.state.rankBy === 'random'}
                                    onChange={this.handlerankByChange}
                                >
                                    Aléatoirement
                                </Radio>
                            </span>
                        </div>
                        <div className="istex-dl-examples col-lg-3">
                            <h4>
                                Exemples de corpus à télécharger &nbsp;
                                <OverlayTrigger
                                    trigger="click"
                                    rootClose
                                    placement="left"
                                    overlay={popoverRequestExamples}
                                >
                                    <span role="button" className="glyphicon glyphicon-question-sign" />
                                </OverlayTrigger>
                            </h4>

                            <OverlayTrigger
                                trigger="click"
                                rootClose
                                placement="left"
                                overlay={popoverRequestExample1}
                            >
                                <button type="button" className="btn-exemple btn-sm">Vieillissement</button>
                            </OverlayTrigger>
                            &nbsp;
                            <OverlayTrigger
                                trigger="click"
                                rootClose
                                placement="left"
                                overlay={popoverRequestExample2}
                            >
                                <button type="button" className="btn-exemple btn-sm">Astrophysique</button>
                            </OverlayTrigger>
                            &nbsp;
                            <OverlayTrigger
                                trigger="click"
                                rootClose
                                placement="left"
                                overlay={popoverRequestExample3}
                            >
                                <button type="button" className="btn-exemple btn-sm">Poissons</button>
                            </OverlayTrigger>
                            &nbsp;
                            <OverlayTrigger
                                trigger="click"
                                rootClose
                                placement="left"
                                overlay={popoverRequestExample4}
                            >
                                <button type="button" className="btn-exemple btn-sm">Polaris</button>
                            </OverlayTrigger>
                            &nbsp;
                        </div>
                    </div>

                    {this.state.errorRequestSyntax &&
                        <div className="istex-dl-error-request row">
                            <div className="col-lg-1" />
                            <div className="col-lg-7">
                                <p>
                                    Erreur de syntaxe dans votre requête &nbsp;
                                    <OverlayTrigger
                                        trigger="click"
                                        rootClose
                                        placement="top"
                                        overlay={popoverRequestHelp}
                                    >
                                        <span role="button" className="glyphicon glyphicon-question-sign" />
                                    </OverlayTrigger>
                                    <br />
                                    <blockquote>{this.state.errorRequestSyntax}</blockquote>
                                </p>
                            </div>
                            <div className="col-lg-3" />
                        </div>
                    }


                    <div className="istex-dl-format row" >

                        <div className="col-lg-1" />
                        <div className="col-lg-7">
                            <h2>
                                Formats et types de fichiers
                            </h2>
                            <p>Créez votre sélection en cochant ou décochant les cases ci-dessous :</p>

                            <Filetype
                                ref={(instance) => { this.child[0] = instance; }}
                                label="Métadonnées"
                                filetype="metadata"
                                formats="xml,mods"
                                labels="XML|MODS"
                                enfantsCoches="xml"
                                value={this.state.extractMetadata}
                                onChange={this.handleFiletypeChange}
                                onFormatChange={this.handleFormatChange}
                            />

                            <Filetype
                                ref={(instance) => { this.child[1] = instance; }}
                                label="Texte intégral"
                                filetype="fulltext"
                                formats="pdf,tei,txt,ocr,zip,tiff"
                                labels="PDF|TEI|TXT|OCR|ZIP|TIFF"
                                value={this.state.extractFulltext}
                                enfantsCoches="pdf,tei,txt,ocr,zip"
                                onChange={this.handleFiletypeChange}
                                onFormatChange={this.handleFormatChange}
                            />
                            <Filetype
                                ref={(instance) => { this.child[2] = instance; }}
                                label="Annexes"
                                filetype="annexes"
                                value={this.state.extractAnnexes}
                                onChange={this.handleFiletypeChange}
                                onFormatChange={this.handleFormatChange}
                                tooltip={appendicesTooltip}
                            />
                            <Filetype
                                ref={(instance) => { this.child[3] = instance; }}
                                label="Couvertures"
                                filetype="covers"
                                value={this.state.extractCovers}
                                onChange={this.handleFiletypeChange}
                                onFormatChange={this.handleFormatChange}
                                tooltip={coversTooltip}
                            />

                            <Filetype
                                ref={(instance) => { this.child[4] = instance; }}
                                label="Enrichissements"
                                filetype="enrichments"
                                formats="tei"
                                labels="TEI"
                                value={this.state.extractEnrichments}
                                onChange={this.handleFiletypeChange}
                                onFormatChange={this.handleFormatChange}
                                disabled
                                tooltip={enrichmentsDisabledTooltip}
                            />
                        </div>
                        <div className="col-lg-3" />
                    </div>

                    <div className="istex-dl-download row">

                        <div className="col-lg-1" />
                        <div className="col-lg-7 text-center">
                            <OverlayTrigger
                                placement="top"
                                overlay={downloadDisabled ? disabledDownloadTooltip : emptyTooltip}
                            >
                                <button type="submit" className="btn btn-theme btn-lg" disabled={downloadDisabled}>
                                    <span className="glyphicon glyphicon-download-alt" aria-hidden="true" />
                                        Télécharger
                                </button>
                            </OverlayTrigger>
                        </div>
                        <div className="col-lg-3" />

                    </div>

                    {this.state.errorDuringDownload &&
                        <div className="istex-dl-error-download row">
                            <div className="col-lg-1" />
                            <div className="col-lg-7">
                                <p>
                                    <span
                                        role="button"
                                        className="glyphicon glyphicon-warning-sign"
                                        aria-hidden="true"
                                    />
                                    &nbsp;
                                    Votre téléchargement s’est interrompu :
                                    <blockquote>
                                        « …message technique de l’API… »
                                    </blockquote>
                                    Veuillez réessayer plus tard ou
                                    <a href="mailto:contact@listes.istex.fr">contactez l’équipe ISTEX</a>
                                </p>
                            </div>
                            <div className="col-lg-3" />
                        </div>
                    }

                </form>

                <Modal show={this.state.downloading} onHide={this.close}>
                    <Modal.Header>
                        <Modal.Title>Téléchargement en cours</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <div className="text-center">
                            La génération de votre corpus est en cours.<br />
                        Veuillez patienter. L’archive sera bientôt téléchargée...
                        <br />
                            <img src="/img/loader.gif" alt="" />
                        </div>

                        <br />
                        Info utilisateurs : Si votre corpus dépasse 4 Go, vous ne pourrez
                        ouvrir l’archive zip sous Windows. Veuillez utiliser par exemple
                        &nbsp;<a href="http://www.7-zip.org/" target="_blank" rel="noopener noreferrer">7zip</a> qui sait
                        gérer les grandes tailles.
                    </Modal.Body>

                    <Modal.Footer>
                        <Modal.Footer>
                            <Button onClick={this.handleCancel}>Fermer</Button>
                        </Modal.Footer>
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
}

Form.defaultProps = {
    className: '',
};
Form.propTypes = {
    className: PropTypes.string,
};
