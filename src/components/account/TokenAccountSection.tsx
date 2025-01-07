import React from "react";
import { Account, useFetchAccountInfo } from "providers/accounts";
import {
  TokenAccount,
  MintAccountInfo,
  TokenAccountInfo,
  MultisigAccountInfo,
} from "validators/accounts/token";
import { create } from "superstruct";
import { TableCardBody } from "components/common/TableCardBody";
import { Address } from "components/common/Address";
import { UnknownAccountCard } from "./UnknownAccountCard";
import { Cluster, useCluster } from "providers/cluster";
import { abbreviatedNumber, normalizeTokenAmount } from "utils";
import { addressLabel } from "utils/tx";
import { reportError } from "utils/sentry";
import { useTokenRegistry } from "providers/mints/token-registry";
import { BigNumber } from "bignumber.js";
import { Copyable } from "components/common/Copyable";
import { CoingeckoStatus, useCoinGecko } from "utils/coingecko";
import { displayTimestampWithoutDate } from "utils/date";
import { LoadingCard } from "components/common/LoadingCard";

const getEthAddress = (link?: string) => {
  let address = "";
  if (link) {
    const extractEth = link.match(/0x[a-fA-F0-9]{40,64}/);

    if (extractEth) {
      address = extractEth[0];
    }
  }

  return address;
};

export function TokenAccountSection({
  account,
  tokenAccount,
}: {
  account: Account;
  tokenAccount: TokenAccount;
}) {
  const { cluster } = useCluster();

  try {
    switch (tokenAccount.type) {
      case "mint": {
        const info = create(tokenAccount.info, MintAccountInfo);
        return <MintAccountCard account={account} info={info} />;
      }
      case "account": {
        const info = create(tokenAccount.info, TokenAccountInfo);
        return <TokenAccountCard account={account} info={info} />;
      }
      case "multisig": {
        const info = create(tokenAccount.info, MultisigAccountInfo);
        return <MultisigAccountCard account={account} info={info} />;
      }
    }
  } catch (err) {
    if (cluster !== Cluster.Custom) {
      reportError(err, {
        address: account.pubkey.toBase58(),
      });
    }
  }
  return <UnknownAccountCard account={account} />;
}

function MintAccountCard({
  account,
  info,
}: {
  account: Account;
  info: MintAccountInfo;
}) {
  const { tokenRegistry } = useTokenRegistry();
  const mintAddress = account.pubkey.toBase58();
  const fetchInfo = useFetchAccountInfo();
  const refresh = () => fetchInfo(account.pubkey);
  const tokenInfo = tokenRegistry.get(mintAddress);

  const bridgeContractAddress = getEthAddress(
    tokenInfo?.extensions?.bridgeContract
  );
  const assetContractAddress = getEthAddress(
    tokenInfo?.extensions?.assetContract
  );

  const coinInfo = useCoinGecko(tokenInfo?.extensions?.coingeckoId);

  let tokenPriceInfo;
  if (coinInfo?.status === CoingeckoStatus.Success) {
    tokenPriceInfo = coinInfo.coinInfo;
  }

  return (
    <>
      {tokenInfo?.extensions?.coingeckoId &&
        coinInfo?.status === CoingeckoStatus.Loading && (
          <LoadingCard message="Loading token price data" />
        )}
      {tokenPriceInfo && tokenPriceInfo.price && (
        <div className="row">
          <div className="col-12 col-lg-4 col-xl">
            <div className="card">
              <div className="card-body">
                <h4>
                  Price{" "}
                  <span className="ml-2 badge badge-primary rank">
                    Rank #{tokenPriceInfo.market_cap_rank}
                  </span>
                </h4>
                <h1 className="mb-0">
                  ${tokenPriceInfo.price.toFixed(2)}{" "}
                  {tokenPriceInfo.price_change_percentage_24h > 0 && (
                    <small className="change-positive">
                      &uarr;{" "}
                      {tokenPriceInfo.price_change_percentage_24h.toFixed(2)}%
                    </small>
                  )}
                  {tokenPriceInfo.price_change_percentage_24h < 0 && (
                    <small className="change-negative">
                      &darr;{" "}
                      {tokenPriceInfo.price_change_percentage_24h.toFixed(2)}%
                    </small>
                  )}
                  {tokenPriceInfo.price_change_percentage_24h === 0 && (
                    <small>0%</small>
                  )}
                </h1>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4 col-xl">
            <div className="card">
              <div className="card-body">
                <h4>24 Hour Volume</h4>
                <h1 className="mb-0">
                  ${abbreviatedNumber(tokenPriceInfo.volume_24)}
                </h1>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4 col-xl">
            <div className="card">
              <div className="card-body">
                <h4>Market Cap</h4>
                <h1 className="mb-0">
                  ${abbreviatedNumber(tokenPriceInfo.market_cap)}
                </h1>
                <p className="updated-time text-muted">
                  Updated at{" "}
                  {displayTimestampWithoutDate(
                    tokenPriceInfo.last_updated.getTime()
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <h3 className="card-header-title mb-0 d-flex align-items-center">
            {tokenInfo ? "Overview" : "Token Mint"}
          </h3>
          <button className="btn btn-white btn-sm" onClick={refresh}>
            <span className="fe fe-refresh-cw mr-2"></span>
            Refresh
          </button>
        </div>
        <TableCardBody>
          <tr>
            <td>Address</td>
            <td className="text-lg-right">
              <Address pubkey={account.pubkey} alignRight raw />
            </td>
          </tr>
          <tr>
            <td>
              {info.mintAuthority === null ? "Fixed Supply" : "Current Supply"}
            </td>
            <td className="text-lg-right">
              {normalizeTokenAmount(info.supply, info.decimals).toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: info.decimals,
                }
              )}
            </td>
          </tr>
          {tokenInfo?.extensions?.website && (
            <tr>
              <td>Website</td>
              <td className="text-lg-right">
                <a
                  rel="noopener noreferrer"
                  target="_blank"
                  href={tokenInfo.extensions.website}
                >
                  {tokenInfo.extensions.website}
                  <span className="fe fe-external-link ml-2"></span>
                </a>
              </td>
            </tr>
          )}
          {info.mintAuthority && (
            <tr>
              <td>Mint Authority</td>
              <td className="text-lg-right">
                <Address pubkey={info.mintAuthority} alignRight link />
              </td>
            </tr>
          )}
          {info.freezeAuthority && (
            <tr>
              <td>Freeze Authority</td>
              <td className="text-lg-right">
                <Address pubkey={info.freezeAuthority} alignRight link />
              </td>
            </tr>
          )}
          <tr>
            <td>Decimals</td>
            <td className="text-lg-right">{info.decimals}</td>
          </tr>
          {!info.isInitialized && (
            <tr>
              <td>Status</td>
              <td className="text-lg-right">Uninitialized</td>
            </tr>
          )}
          {tokenInfo?.extensions?.bridgeContract && bridgeContractAddress && (
            <tr>
              <td>Bridge Contract</td>
              <td className="text-lg-right">
                <Copyable text={bridgeContractAddress}>
                  <a
                    href={tokenInfo.extensions.bridgeContract}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {bridgeContractAddress}
                  </a>
                </Copyable>
              </td>
            </tr>
          )}
          {tokenInfo?.extensions?.assetContract && assetContractAddress && (
            <tr>
              <td>Bridged Asset Contract</td>
              <td className="text-lg-right">
                <Copyable text={assetContractAddress}>
                  <a
                    href={tokenInfo.extensions.bridgeContract}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {assetContractAddress}
                  </a>
                </Copyable>
              </td>
            </tr>
          )}
        </TableCardBody>
      </div>
    </>
  );
}

function TokenAccountCard({
  account,
  info,
}: {
  account: Account;
  info: TokenAccountInfo;
}) {
  const refresh = useFetchAccountInfo();
  const { cluster } = useCluster();
  const { tokenRegistry } = useTokenRegistry();
  const label = addressLabel(account.pubkey.toBase58(), cluster, tokenRegistry);

  let unit, balance;
  if (info.isNative) {
    unit = "NZT";
    balance = (
      <>
        <span className="text-monospace">
          {new BigNumber(info.tokenAmount.uiAmountString).toFormat(9)}
        </span>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="9" r="9" fill="#B1FF69" fill-opacity="0.15"/>
          <g filter="url(#filter0_d_2344_55)">
            <path d="M6.34906 12.1998C6.3564 12.2071 6.36466 12.2145 6.37198 12.2218L6.66173 11.8101C6.90197 11.3379 6.9955 10.907 6.99825 10.5402C6.99458 10.344 6.96707 10.1496 6.91756 9.96077C6.88271 9.84708 6.85704 9.72971 6.84053 9.61144C6.84053 9.61052 6.84053 9.60869 6.84053 9.60685C6.82953 9.528 6.82219 9.44731 6.81853 9.36663C6.7681 8.0665 7.77854 6.9525 9.07508 6.87915L9.06591 6.8709C9.37491 6.85164 9.82512 6.91949 10.2029 6.82047C10.5944 6.70952 10.9502 6.49406 11.2326 6.19699C11.2464 6.18232 11.262 6.16948 11.2784 6.15848L11.5443 5.78165C10.4312 5.00964 8.96229 4.79784 7.61442 5.34888C5.49816 6.21259 4.48404 8.62946 5.3487 10.7456C5.56509 11.2747 5.87776 11.7349 6.25921 12.1136C6.28855 12.1429 6.3179 12.1713 6.34814 12.1998H6.34906Z" fill="#C5FF69"/>
            <path d="M11.7386 6.49772C11.7322 6.51697 11.7249 6.53714 11.7138 6.55548C11.4635 7.024 11.3572 7.73183 11.3801 8.01148C11.4177 8.47633 11.5598 8.77799 11.5158 9.13374C11.5488 10.4238 10.5402 11.5194 9.25375 11.5901C9.25375 11.5901 9.25192 11.5901 9.25101 11.5901C8.96767 11.6084 8.93467 11.5809 8.67519 11.5928C8.1397 11.6166 7.56846 11.8404 7.17235 12.2584L6.90735 12.6353C6.98347 12.6857 7.06048 12.7334 7.13842 12.7811C7.17417 12.8012 7.20994 12.8205 7.2457 12.8397C8.29191 13.3917 9.56551 13.4935 10.7456 13.0112C12.8618 12.1466 13.876 9.7297 13.0113 7.61355C12.7748 7.03501 12.4217 6.53805 11.9908 6.14014L11.7386 6.49772Z" fill="#C5FF69"/>
          </g>
          <defs>
            <filter id="filter0_d_2344_55" x="4.85281" y="5.04004" width="8.65437" height="8.65449" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dy="0.187231"/>
              <feGaussianBlur stdDeviation="0.0936155"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_2344_55"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_2344_55" result="shape"/>
            </filter>
          </defs>
        </svg>
      </>
    );
  } else {
    balance = <>{info.tokenAmount.uiAmountString}</>;
    unit = tokenRegistry.get(info.mint.toBase58())?.symbol || "tokens";
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-header-title mb-0 d-flex align-items-center">
          Token Account
        </h3>
        <button
          className="btn btn-white btn-sm"
          onClick={() => refresh(account.pubkey)}
        >
          <span className="fe fe-refresh-cw mr-2"></span>
          Refresh
        </button>
      </div>

      <TableCardBody>
        <tr>
          <td>Address</td>
          <td className="text-lg-right">
            <Address pubkey={account.pubkey} alignRight raw />
          </td>
        </tr>
        {label && (
          <tr>
            <td>Address Label</td>
            <td className="text-lg-right">{label}</td>
          </tr>
        )}
        <tr>
          <td>Mint</td>
          <td className="text-lg-right">
            <Address pubkey={info.mint} alignRight link />
          </td>
        </tr>
        <tr>
          <td>Owner</td>
          <td className="text-lg-right">
            <Address pubkey={info.owner} alignRight link />
          </td>
        </tr>
        <tr>
          <td>Token balance ({unit})</td>
          <td className="text-lg-right">{balance}</td>
        </tr>
        {info.state === "uninitialized" && (
          <tr>
            <td>Status</td>
            <td className="text-lg-right">Uninitialized</td>
          </tr>
        )}
        {info.rentExemptReserve && (
          <tr>
            <td>Rent-exempt reserve (NZT)</td>
            <td className="text-lg-right">
              <>
                <span className="text-monospace">
                  {new BigNumber(info.rentExemptReserve.uiAmountString).toFormat(9)}
                </span>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="9" r="9" fill="#B1FF69" fill-opacity="0.15"/>
                  <g filter="url(#filter0_d_2344_55)">
                    <path d="M6.34906 12.1998C6.3564 12.2071 6.36466 12.2145 6.37198 12.2218L6.66173 11.8101C6.90197 11.3379 6.9955 10.907 6.99825 10.5402C6.99458 10.344 6.96707 10.1496 6.91756 9.96077C6.88271 9.84708 6.85704 9.72971 6.84053 9.61144C6.84053 9.61052 6.84053 9.60869 6.84053 9.60685C6.82953 9.528 6.82219 9.44731 6.81853 9.36663C6.7681 8.0665 7.77854 6.9525 9.07508 6.87915L9.06591 6.8709C9.37491 6.85164 9.82512 6.91949 10.2029 6.82047C10.5944 6.70952 10.9502 6.49406 11.2326 6.19699C11.2464 6.18232 11.262 6.16948 11.2784 6.15848L11.5443 5.78165C10.4312 5.00964 8.96229 4.79784 7.61442 5.34888C5.49816 6.21259 4.48404 8.62946 5.3487 10.7456C5.56509 11.2747 5.87776 11.7349 6.25921 12.1136C6.28855 12.1429 6.3179 12.1713 6.34814 12.1998H6.34906Z" fill="#C5FF69"/>
                    <path d="M11.7386 6.49772C11.7322 6.51697 11.7249 6.53714 11.7138 6.55548C11.4635 7.024 11.3572 7.73183 11.3801 8.01148C11.4177 8.47633 11.5598 8.77799 11.5158 9.13374C11.5488 10.4238 10.5402 11.5194 9.25375 11.5901C9.25375 11.5901 9.25192 11.5901 9.25101 11.5901C8.96767 11.6084 8.93467 11.5809 8.67519 11.5928C8.1397 11.6166 7.56846 11.8404 7.17235 12.2584L6.90735 12.6353C6.98347 12.6857 7.06048 12.7334 7.13842 12.7811C7.17417 12.8012 7.20994 12.8205 7.2457 12.8397C8.29191 13.3917 9.56551 13.4935 10.7456 13.0112C12.8618 12.1466 13.876 9.7297 13.0113 7.61355C12.7748 7.03501 12.4217 6.53805 11.9908 6.14014L11.7386 6.49772Z" fill="#C5FF69"/>
                  </g>
                  <defs>
                    <filter id="filter0_d_2344_55" x="4.85281" y="5.04004" width="8.65437" height="8.65449" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                      <feOffset dy="0.187231"/>
                      <feGaussianBlur stdDeviation="0.0936155"/>
                      <feComposite in2="hardAlpha" operator="out"/>
                      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_2344_55"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_2344_55" result="shape"/>
                    </filter>
                  </defs>
                </svg>
              </>
            </td>
          </tr>
        )}
      </TableCardBody>
    </div>
  );
}

function MultisigAccountCard({
  account,
  info,
}: {
  account: Account;
  info: MultisigAccountInfo;
}) {
  const refresh = useFetchAccountInfo();

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-header-title mb-0 d-flex align-items-center">
          Multisig Account
        </h3>
        <button
          className="btn btn-white btn-sm"
          onClick={() => refresh(account.pubkey)}
        >
          <span className="fe fe-refresh-cw mr-2"></span>
          Refresh
        </button>
      </div>

      <TableCardBody>
        <tr>
          <td>Address</td>
          <td className="text-lg-right">
            <Address pubkey={account.pubkey} alignRight raw />
          </td>
        </tr>
        <tr>
          <td>Required Signers</td>
          <td className="text-lg-right">{info.numRequiredSigners}</td>
        </tr>
        <tr>
          <td>Valid Signers</td>
          <td className="text-lg-right">{info.numValidSigners}</td>
        </tr>
        {info.signers.map((signer) => (
          <tr key={signer.toString()}>
            <td>Signer</td>
            <td className="text-lg-right">
              <Address pubkey={signer} alignRight link />
            </td>
          </tr>
        ))}
        {!info.isInitialized && (
          <tr>
            <td>Status</td>
            <td className="text-lg-right">Uninitialized</td>
          </tr>
        )}
      </TableCardBody>
    </div>
  );
}
