# Dashboard web-client

Web user interface for creating and displaying [Co-inform](https://coinform.eu) dashboards.

Within the Co-inform project dashboards provide end-users like policymakers, journalists and the general public with an overview of the data collected by the project. Some of the data that can be visualized is:

* number of documents analysed
* breakdown of documents by:
  * dates of publication
  * assessed types of credibility 
  * topics
  * keyworkds
  * language
* breakdown of claims by:
  * publisher
  * credibility
  * topic
  * whether it has been reviewed (by a fact-checker or a co-inform user)
* breakdown of user-provided accuracy ratings

# Technical Description

The dashboard relies on [Banana](https://doc.lucidworks.com/lucidworks-hdpsearch/2.5/Guide-Banana.html), a data visualization tool developed by [LucidWorks](https://lucidworks.com/). 

## Types of users

The dashboard interface is meant to be used by two types of users:

**End-users** are general audience who are not interested in learning how to configure the dashboard but want to explore the data and get a global understanding of trends in the data. In Co-inform end-users will be mainly policymakers and journalists. These users can drill down on the data by selecting filters using the components provided by the creators of the dashboard.

The **Creators** are technical people who configure the dashboard by adding, configuring and removing components. All the `cog` and `add` icons in the interface are meant for this type of users. The interface for configuring components is not the most intuitive, but it's meant for technical people, who can refer to [a generic Banana manual](https://www.snap4city.org/download/video/Banana_Lucidworks_User_Manual.pdf)  as well as to the [Banana Guide](https://doc.lucidworks.com/lucidworks-hdpsearch/2.5/Guide-Banana.html).  The idea is that once dashboard creators are happy with the layout and the components, they can disable the configuration buttons to *release* the dashboard.

